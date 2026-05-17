"""
DisasterVault — institutional disaster relief on Algorand (ARC-4 / PuyaPy).

Security notes (AVM):
- No reentrancy: a single app call cannot re-enter; inner txns complete before the outer call returns.
- Overflow: UInt64 addition is checked by the AVM (panics on overflow).
- Access: create_campaign is admin-only; approvals are allow-listed in per-campaign box storage.
- Assets: donations use grouped ASA transfers; disburse uses inner AssetTransfer after threshold met.
"""

from algopy import ARC4Contract, Account, BoxRef, Global, GlobalState, Txn, UInt64, gtxn, itxn, op, urange
from algopy.arc4 import (
    Address as ARC4Address,
    DynamicArray,
    String as ARC4String,
    Struct,
    UInt64 as ARC4UInt64,
    abimethod,
    emit,
)

# Box layout (bytes) — fixed slots; ARC-4 strings truncated to fit (metadata also in app call args / indexer).
# | 0..7 target | 8..15 raised | 16..23 approval_count | 24..31 threshold |
# | 32..39 expiry_round | 40..47 asset_id | 48..55 status | 56..63 approver_count |
# | 64..223 approvers (5 x 32) | 224..231 approval_flags | 232..247 name | 248..255 region |
# op.replace offsets must be <= 255 (AVM immediate limit).
NAME_LEN = 16
REGION_LEN = 8
MAX_APPROVERS = 5
APPROVER_BYTES = 32
BOX_SIZE = 256

# status codes: 1=active, 2=approved, 3=disbursed, 4=expired (string labels in client/docs)


class Disbursed(Struct):
    """ARC-28 style event payload emitted after successful disburse."""

    campaign_id: ARC4UInt64
    total_micro: ARC4UInt64
    beneficiary_count: ARC4UInt64


class DisasterVault(ARC4Contract):
    campaign_count: GlobalState[UInt64]
    admin: GlobalState[ARC4Address]
    treasury: GlobalState[ARC4Address]

    def __init__(self) -> None:
        self.campaign_count = GlobalState(UInt64(0))
        self.admin = GlobalState(ARC4Address())
        self.treasury = GlobalState(ARC4Address())

    @abimethod
    def bootstrap(self, admin: ARC4Address, treasury: ARC4Address) -> None:
        """One-time setup: admin creates campaigns; treasury receives expire() refunds."""
        assert self.admin.value.bytes == op.bzero(32)
        self.admin.value = admin
        self.treasury.value = treasury

    @abimethod
    def create_campaign(
        self,
        name: ARC4String,
        target_amount: ARC4UInt64,
        region: ARC4String,
        approvers: DynamicArray[ARC4Address],
        threshold: ARC4UInt64,
        expiry_round: ARC4UInt64,
        asset_id: ARC4UInt64,
    ) -> ARC4UInt64:
        """Admin-only campaign creation. Approvers stored on-chain (max 5)."""
        assert Txn.sender.bytes == self.admin.value.bytes
        assert target_amount.native > UInt64(0)
        assert threshold.native > UInt64(0)
        assert threshold.native <= UInt64(MAX_APPROVERS)
        assert approvers.length > UInt64(0)
        assert approvers.length <= UInt64(MAX_APPROVERS)
        assert expiry_round.native > Global.round

        cid = self.campaign_count.value + UInt64(1)
        self.campaign_count.value = cid

        box = BoxRef(key=op.itob(cid))
        box.create(size=BOX_SIZE)
        buf = op.bzero(BOX_SIZE)
        buf = op.replace(buf, 0, op.itob(target_amount.native))
        buf = op.replace(buf, 8, op.itob(UInt64(0)))
        buf = op.replace(buf, 16, op.itob(UInt64(0)))
        buf = op.replace(buf, 24, op.itob(threshold.native))
        buf = op.replace(buf, 32, op.itob(expiry_round.native))
        buf = op.replace(buf, 40, op.itob(asset_id.native))
        buf = op.replace(buf, 48, op.itob(UInt64(1)))
        buf = op.replace(buf, 56, op.itob(approvers.length))

        for i in urange(approvers.length):
            start = UInt64(64) + i * UInt64(APPROVER_BYTES)
            buf = op.replace(buf, start, approvers[i].bytes)

        # Truncate UTF-8 name/region into fixed box slots (full strings remain in txn args for indexers).
        name_slice = op.extract(name.bytes, 0, NAME_LEN)
        region_slice = op.extract(region.bytes, 0, REGION_LEN)
        buf = op.replace(buf, 232, name_slice)
        buf = op.replace(buf, 248, region_slice)
        buf = op.replace(buf, 224, op.itob(UInt64(0)))
        box.put(buf)
        # Ensure app account can hold the campaign ASA (0-amount self axfer).
        itxn.AssetTransfer(
            sender=Global.current_application_address,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(0),
            xfer_asset=asset_id.native,
            fee=0,
        ).submit()
        return ARC4UInt64(cid)

    @abimethod
    def donate(self, campaign_id: ARC4UInt64, donation: gtxn.AssetTransferTransaction) -> None:
        """Anyone may donate the campaign ASA via grouped axfer into the app account."""
        cid = campaign_id.native
        box = BoxRef(key=op.itob(cid))
        buf = box.get(default=op.bzero(BOX_SIZE))
        target = op.btoi(op.extract(buf, 0, 8))
        assert target > UInt64(0)
        status = op.btoi(op.extract(buf, 48, 8))
        assert status == UInt64(1)
        expiry = op.btoi(op.extract(buf, 32, 8))
        assert Global.round < expiry
        asset_id = op.btoi(op.extract(buf, 40, 8))
        assert donation.asset_receiver == Global.current_application_address
        assert donation.xfer_asset.id == asset_id
        assert donation.asset_amount > UInt64(0)

        raised = op.btoi(op.extract(buf, 8, 8))
        raised = raised + donation.asset_amount
        buf = op.replace(buf, 8, op.itob(raised))
        box.put(buf)

    @abimethod
    def submit_approval(self, campaign_id: ARC4UInt64) -> None:
        """Increment approval_count when sender is in the campaign approver list."""
        cid = campaign_id.native
        sender = Txn.sender.bytes
        box = BoxRef(key=op.itob(cid))
        buf = box.get(default=op.bzero(BOX_SIZE))
        status = op.btoi(op.extract(buf, 48, 8))
        assert status == UInt64(1)
        expiry = op.btoi(op.extract(buf, 32, 8))
        assert Global.round < expiry

        count = op.btoi(op.extract(buf, 56, 8))
        flags = op.btoi(op.extract(buf, 224, 8))
        approvals = op.btoi(op.extract(buf, 16, 8))
        threshold = op.btoi(op.extract(buf, 24, 8))
        found = UInt64(0)
        new_flags = flags

        for i in urange(count):
            start = UInt64(64) + i * UInt64(APPROVER_BYTES)
            approver = op.extract(buf, start, APPROVER_BYTES)
            if sender == approver:
                mask = UInt64(1) << i
                assert (flags & mask) == UInt64(0)
                new_flags = flags | mask
                approvals = approvals + UInt64(1)
                found = UInt64(1)

        assert found == UInt64(1)
        buf = op.replace(buf, 16, op.itob(approvals))
        buf = op.replace(buf, 224, op.itob(new_flags))
        if approvals >= threshold:
            buf = op.replace(buf, 48, op.itob(UInt64(2)))
        box.put(buf)

    @abimethod
    def disburse(
        self,
        campaign_id: ARC4UInt64,
        beneficiaries: DynamicArray[ARC4Address],
        amounts: DynamicArray[ARC4UInt64],
    ) -> None:
        """After status == approved, send ASA to beneficiaries via inner asset transfers."""
        assert beneficiaries.length == amounts.length
        assert beneficiaries.length > UInt64(0)
        assert beneficiaries.length <= UInt64(8)

        cid = campaign_id.native
        box = BoxRef(key=op.itob(cid))
        buf = box.get(default=op.bzero(BOX_SIZE))
        status = op.btoi(op.extract(buf, 48, 8))
        assert status == UInt64(2)

        asset_id = op.btoi(op.extract(buf, 40, 8))
        raised = op.btoi(op.extract(buf, 8, 8))
        total = UInt64(0)
        for i in urange(beneficiaries.length):
            total = total + amounts[i].native
        assert total <= raised

        for i in urange(beneficiaries.length):
            amt = amounts[i].native
            if amt > UInt64(0):
                itxn.AssetTransfer(
                    sender=Global.current_application_address,
                    asset_receiver=Account(beneficiaries[i].bytes),
                    asset_amount=amt,
                    xfer_asset=asset_id,
                    fee=0,
                ).submit()

        buf = op.replace(buf, 48, op.itob(UInt64(3)))
        box.put(buf)
        emit(
            Disbursed(
                campaign_id=ARC4UInt64(cid),
                total_micro=ARC4UInt64(total),
                beneficiary_count=ARC4UInt64(beneficiaries.length),
            )
        )

    @abimethod
    def expire(self, campaign_id: ARC4UInt64) -> None:
        """
        After expiry_round, move remaining ASA balance for this asset to treasury (simplified refund path).
        Production would track per-donor shares in boxes — MVP sends contract ASA balance to treasury.
        """
        cid = campaign_id.native
        box = BoxRef(key=op.itob(cid))
        buf = box.get(default=op.bzero(BOX_SIZE))
        status = op.btoi(op.extract(buf, 48, 8))
        assert status == UInt64(1) or status == UInt64(2)
        expiry = op.btoi(op.extract(buf, 32, 8))
        assert Global.round >= expiry

        asset_id = op.btoi(op.extract(buf, 40, 8))
        raised = op.btoi(op.extract(buf, 8, 8))
        if raised > UInt64(0):
            itxn.AssetTransfer(
                sender=Global.current_application_address,
                asset_receiver=Account(self.treasury.value.bytes),
                asset_amount=raised,
                xfer_asset=asset_id,
                fee=0,
            ).submit()
            buf = op.replace(buf, 8, op.itob(UInt64(0)))
        buf = op.replace(buf, 48, op.itob(UInt64(4)))
        box.put(buf)

    @abimethod(readonly=True)
    def get_campaign(
        self, campaign_id: ARC4UInt64
    ) -> tuple[ARC4UInt64, ARC4UInt64, ARC4UInt64, ARC4UInt64, ARC4UInt64]:
        """Returns target, raised, approval_count, threshold, status."""
        cid = campaign_id.native
        box = BoxRef(key=op.itob(cid))
        buf = box.get(default=op.bzero(BOX_SIZE))
        return (
            ARC4UInt64(op.btoi(op.extract(buf, 0, 8))),
            ARC4UInt64(op.btoi(op.extract(buf, 8, 8))),
            ARC4UInt64(op.btoi(op.extract(buf, 16, 8))),
            ARC4UInt64(op.btoi(op.extract(buf, 24, 8))),
            ARC4UInt64(op.btoi(op.extract(buf, 48, 8))),
        )
