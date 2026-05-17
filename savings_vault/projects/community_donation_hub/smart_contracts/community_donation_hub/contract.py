"""CommunityDonationHub — admin-approved appeals with ALGO donate and beneficiary withdraw."""

from algopy import ARC4Contract, Account, BoxRef, Global, GlobalState, Txn, UInt64, gtxn, itxn, op
from algopy.arc4 import (
    Address as ARC4Address,
    String as ARC4String,
    Struct,
    UInt64 as ARC4UInt64,
    abimethod,
    emit,
)

BOX_SIZE = 128


class Donated(Struct):
    appeal_id: ARC4UInt64
    amount_micro: ARC4UInt64
    donor: ARC4Address


class Withdrawn(Struct):
    appeal_id: ARC4UInt64
    amount_micro: ARC4UInt64
    beneficiary: ARC4Address


class CommunityDonationHub(ARC4Contract):
    appeal_count: GlobalState[UInt64]
    admin: GlobalState[ARC4Address]

    def __init__(self) -> None:
        self.appeal_count = GlobalState(UInt64(0))
        self.admin = GlobalState(ARC4Address())

    @abimethod
    def bootstrap(self, admin: ARC4Address) -> None:
        assert self.admin.value.bytes == op.bzero(32)
        self.admin.value = admin

    @abimethod
    def create_appeal(
        self,
        target: ARC4UInt64,
        beneficiary: ARC4Address,
        metadata_uri: ARC4String,
    ) -> ARC4UInt64:
        assert target.native > UInt64(0)
        aid = self.appeal_count.value + UInt64(1)
        self.appeal_count.value = aid
        box = BoxRef(key=op.itob(aid))
        box.create(size=BOX_SIZE)
        buf = op.bzero(BOX_SIZE)
        buf = op.replace(buf, 0, op.itob(target.native))
        buf = op.replace(buf, 8, op.itob(UInt64(0)))
        buf = op.replace(buf, 16, op.itob(UInt64(0)))
        buf = op.replace(buf, 24, beneficiary.bytes)
        box.put(buf)
        return ARC4UInt64(aid)

    @abimethod
    def admin_approve(self, appeal_id: ARC4UInt64) -> None:
        assert Txn.sender.bytes == self.admin.value.bytes
        box = BoxRef(key=op.itob(appeal_id.native))
        default = op.bzero(BOX_SIZE)
        buf = box.get(default=default)
        status = op.btoi(op.extract(buf, 16, 8))
        assert status == UInt64(0)
        buf = op.replace(buf, 16, op.itob(UInt64(1)))
        box.put(buf)

    @abimethod
    def donate(self, appeal_id: ARC4UInt64, payment: gtxn.PaymentTransaction) -> None:
        assert payment.receiver == Global.current_application_address
        assert payment.amount > UInt64(0)
        box = BoxRef(key=op.itob(appeal_id.native))
        default = op.bzero(BOX_SIZE)
        buf = box.get(default=default)
        appeal_target = op.btoi(op.extract(buf, 0, 8))
        assert appeal_target > UInt64(0)
        status = op.btoi(op.extract(buf, 16, 8))
        assert status == UInt64(1)
        raised = op.btoi(op.extract(buf, 8, 8))
        raised = raised + payment.amount
        buf = op.replace(buf, 8, op.itob(raised))
        box.put(buf)
        emit(
            Donated(
                appeal_id=appeal_id,
                amount_micro=ARC4UInt64(payment.amount),
                donor=ARC4Address(Txn.sender),
            )
        )

    @abimethod
    def withdraw(self, appeal_id: ARC4UInt64) -> None:
        box = BoxRef(key=op.itob(appeal_id.native))
        default = op.bzero(BOX_SIZE)
        buf = box.get(default=default)
        status = op.btoi(op.extract(buf, 16, 8))
        assert status == UInt64(1)
        beneficiary = op.extract(buf, 24, 32)
        assert Txn.sender.bytes == beneficiary
        raised = op.btoi(op.extract(buf, 8, 8))
        assert raised > UInt64(0)
        itxn.Payment(receiver=Account(beneficiary), amount=raised, fee=0).submit()
        emit(
            Withdrawn(
                appeal_id=appeal_id,
                amount_micro=ARC4UInt64(raised),
                beneficiary=ARC4Address(Txn.sender),
            )
        )
        buf = op.replace(buf, 16, op.itob(UInt64(2)))
        buf = op.replace(buf, 8, op.itob(UInt64(0)))
        box.put(buf)

    @abimethod(readonly=True)
    def get_appeal(self, appeal_id: ARC4UInt64) -> tuple[ARC4UInt64, ARC4UInt64, ARC4UInt64]:
        box = BoxRef(key=op.itob(appeal_id.native))
        default = op.bzero(BOX_SIZE)
        buf = box.get(default=default)
        target = ARC4UInt64(op.btoi(op.extract(buf, 0, 8)))
        raised = ARC4UInt64(op.btoi(op.extract(buf, 8, 8)))
        status = ARC4UInt64(op.btoi(op.extract(buf, 16, 8)))
        return target, raised, status
