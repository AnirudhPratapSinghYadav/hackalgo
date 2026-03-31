from algopy import (
    ARC4Contract, GlobalState, LocalState,
    UInt64, Bytes, Account, Asset,
    itxn, arc4, subroutine,
    BoxMap, op, Txn, Global,
    PaymentTransaction, gtxn
)

class SavingsVault(ARC4Contract):
    # Global State
    total_deposited: GlobalState[UInt64]
    total_users: GlobalState[UInt64]
    milestone_1: GlobalState[UInt64]  # 10 ALGO
    milestone_2: GlobalState[UInt64]  # 50 ALGO
    milestone_3: GlobalState[UInt64]  # 100 ALGO
    badge_asset_1: GlobalState[UInt64]
    badge_asset_2: GlobalState[UInt64]
    badge_asset_3: GlobalState[UInt64]

    # Local State per user
    user_total: LocalState[UInt64]
    user_milestone: LocalState[UInt64]
    user_streak: LocalState[UInt64]
    last_deposit: LocalState[UInt64]

    def __init__(self) -> None:
        self.total_deposited = GlobalState(UInt64(0))
        self.total_users = GlobalState(UInt64(0))
        self.milestone_1 = GlobalState(UInt64(10_000_000))   # 10 ALGO
        self.milestone_2 = GlobalState(UInt64(50_000_000))   # 50 ALGO
        self.milestone_3 = GlobalState(UInt64(100_000_000))  # 100 ALGO
        self.badge_asset_1 = GlobalState(UInt64(0))
        self.badge_asset_2 = GlobalState(UInt64(0))
        self.badge_asset_3 = GlobalState(UInt64(0))

    @arc4.abimethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        self.user_total[Txn.sender] = UInt64(0)
        self.user_milestone[Txn.sender] = UInt64(0)
        self.user_streak[Txn.sender] = UInt64(0)
        self.last_deposit[Txn.sender] = UInt64(0)
        self.total_users.value += UInt64(1)

    @arc4.abimethod
    def deposit(self, payment: PaymentTransaction) -> UInt64:
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= UInt64(1_000_000), "Minimum 1 ALGO"
        assert payment.sender == Txn.sender

        self.user_total[Txn.sender] += payment.amount
        self.total_deposited.value += payment.amount

        # Update streak
        if self.last_deposit[Txn.sender] > UInt64(0):
            self.user_streak[Txn.sender] += UInt64(1)
        self.last_deposit[Txn.sender] = Global.latest_timestamp

        # Check milestones
        new_milestone = self._check_milestone(Txn.sender)
        return new_milestone

    @arc4.abimethod
    def claim_badge(self, milestone_level: UInt64) -> UInt64:
        current = self.user_milestone[Txn.sender]
        assert milestone_level > current, "Already claimed"

        user_bal = self.user_total[Txn.sender]

        if milestone_level == UInt64(1):
            assert user_bal >= self.milestone_1.value
            badge_id = self._mint_badge(
                Bytes(b"Vault Starter"),
                Bytes(b"VS1"),
                Bytes(b"ipfs://QmBadge1")
            )
            self.badge_asset_1.value = badge_id

        elif milestone_level == UInt64(2):
            assert user_bal >= self.milestone_2.value
            badge_id = self._mint_badge(
                Bytes(b"Vault Builder"),
                Bytes(b"VB2"),
                Bytes(b"ipfs://QmBadge2")
            )
            self.badge_asset_2.value = badge_id

        elif milestone_level == UInt64(3):
            assert user_bal >= self.milestone_3.value
            badge_id = self._mint_badge(
                Bytes(b"Vault Master"),
                Bytes(b"VM3"),
                Bytes(b"ipfs://QmBadge3")
            )
            self.badge_asset_3.value = badge_id
        else:
            badge_id = UInt64(0)

        self.user_milestone[Txn.sender] = milestone_level
        return badge_id

    @arc4.abimethod
    def withdraw(self, amount: UInt64) -> None:
        assert self.user_total[Txn.sender] >= amount
        self.user_total[Txn.sender] -= amount
        self.total_deposited.value -= amount
        itxn.Payment(
            receiver=Txn.sender,
            amount=amount,
            fee=0
        ).submit()

    @arc4.abimethod(readonly=True)
    def get_user_stats(self, user: Account) -> arc4.Tuple[
        arc4.UInt64, arc4.UInt64, arc4.UInt64
    ]:
        return arc4.Tuple((
            arc4.UInt64(self.user_total[user]),
            arc4.UInt64(self.user_milestone[user]),
            arc4.UInt64(self.user_streak[user])
        ))

    @arc4.abimethod(readonly=True)
    def get_global_stats(self) -> arc4.Tuple[
        arc4.UInt64, arc4.UInt64
    ]:
        return arc4.Tuple((
            arc4.UInt64(self.total_deposited.value),
            arc4.UInt64(self.total_users.value)
        ))

    @subroutine
    def _check_milestone(self, user: Account) -> UInt64:
        bal = self.user_total[user]
        current = self.user_milestone[user]
        if bal >= self.milestone_3.value and current < UInt64(3):
            return UInt64(3)
        elif bal >= self.milestone_2.value and current < UInt64(2):
            return UInt64(2)
        elif bal >= self.milestone_1.value and current < UInt64(1):
            return UInt64(1)
        return UInt64(0)

    @subroutine
    def _mint_badge(
        self,
        name: Bytes,
        unit: Bytes,
        url: Bytes
    ) -> UInt64:
        result = itxn.AssetConfig(
            total=1,
            decimals=0,
            asset_name=name,
            unit_name=unit,
            url=url,
            manager=Global.current_application_address,
            fee=0
        ).submit()
        return result.created_asset.id
