from algopy import (
    ARC4Contract, GlobalState, LocalState,
    UInt64, Bytes, Account,
    itxn, arc4, subroutine,
    Txn, Global, gtxn,
)


class SavingsVault(ARC4Contract):
    total_deposited: GlobalState[UInt64]
    total_users: GlobalState[UInt64]
    milestone_1: GlobalState[UInt64]
    milestone_2: GlobalState[UInt64]
    milestone_3: GlobalState[UInt64]
    badge_asset_1: GlobalState[UInt64]
    badge_asset_2: GlobalState[UInt64]
    badge_asset_3: GlobalState[UInt64]
    pact_enabled: GlobalState[UInt64]
    pact_required_amount: GlobalState[UInt64]
    pact_cadence_seconds: GlobalState[UInt64]
    pact_penalty_amount: GlobalState[UInt64]
    pact_user_a: GlobalState[Bytes]
    pact_user_b: GlobalState[Bytes]
    user_total: LocalState[UInt64]
    user_milestone: LocalState[UInt64]
    user_streak: LocalState[UInt64]
    last_deposit: LocalState[UInt64]
    lock_enabled: LocalState[UInt64]
    user_goal_amount: LocalState[UInt64]
    user_penalty_bps: LocalState[UInt64]
    penalty_sink: LocalState[Bytes]
    dream_uri: LocalState[Bytes]
    dream_title: LocalState[Bytes]

    def __init__(self) -> None:
        self.total_deposited = GlobalState(UInt64(0))
        self.total_users = GlobalState(UInt64(0))
        self.milestone_1 = GlobalState(UInt64(10_000_000))
        self.milestone_2 = GlobalState(UInt64(50_000_000))
        self.milestone_3 = GlobalState(UInt64(100_000_000))
        self.badge_asset_1 = GlobalState(UInt64(0))
        self.badge_asset_2 = GlobalState(UInt64(0))
        self.badge_asset_3 = GlobalState(UInt64(0))
        self.pact_enabled = GlobalState(UInt64(0))
        self.pact_required_amount = GlobalState(UInt64(1_000_000))
        self.pact_cadence_seconds = GlobalState(UInt64(604_800))
        self.pact_penalty_amount = GlobalState(UInt64(100_000))
        self.pact_user_a = GlobalState(Bytes(b""))
        self.pact_user_b = GlobalState(Bytes(b""))
        self.user_total = LocalState(UInt64)
        self.user_milestone = LocalState(UInt64)
        self.user_streak = LocalState(UInt64)
        self.last_deposit = LocalState(UInt64)
        self.lock_enabled = LocalState(UInt64)
        self.user_goal_amount = LocalState(UInt64)
        self.user_penalty_bps = LocalState(UInt64)
        self.penalty_sink = LocalState(Bytes)
        self.dream_uri = LocalState(Bytes)
        self.dream_title = LocalState(Bytes)

    @arc4.abimethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        self.user_total[Txn.sender] = UInt64(0)
        self.user_milestone[Txn.sender] = UInt64(0)
        self.user_streak[Txn.sender] = UInt64(0)
        self.last_deposit[Txn.sender] = UInt64(0)
        self.lock_enabled[Txn.sender] = UInt64(0)
        self.user_goal_amount[Txn.sender] = UInt64(0)
        self.user_penalty_bps[Txn.sender] = UInt64(0)
        self.penalty_sink[Txn.sender] = Txn.sender.bytes
        self.dream_uri[Txn.sender] = Bytes(b"")
        self.dream_title[Txn.sender] = Bytes(b"")
        self.total_users.value += UInt64(1)

    @arc4.abimethod
    def deposit(self, payment: gtxn.PaymentTransaction) -> UInt64:
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= UInt64(1_000_000)
        assert payment.sender == Txn.sender
        self.user_total[Txn.sender] += payment.amount
        self.total_deposited.value += payment.amount
        if self.last_deposit[Txn.sender] > UInt64(0):
            self.user_streak[Txn.sender] += UInt64(1)
        self.last_deposit[Txn.sender] = Global.latest_timestamp
        return self._check_milestone(Txn.sender)

    @arc4.abimethod
    def claim_badge(self, milestone_level: UInt64) -> UInt64:
        current = self.user_milestone[Txn.sender]
        assert milestone_level > current
        # Prevent invalid level injection (e.g. 4+) from mutating local state.
        assert milestone_level >= UInt64(1) and milestone_level <= UInt64(3)
        user_bal = self.user_total[Txn.sender]
        badge_id = UInt64(0)
        if milestone_level == UInt64(1):
            assert user_bal >= self.milestone_1.value
            badge_id = self._mint_badge(Bytes(b"Vault Starter"), Bytes(b"VS1"), Bytes(b"ipfs://QmBadge1"))
            self.badge_asset_1.value = badge_id
        elif milestone_level == UInt64(2):
            assert user_bal >= self.milestone_2.value
            badge_id = self._mint_badge(Bytes(b"Vault Builder"), Bytes(b"VB2"), Bytes(b"ipfs://QmBadge2"))
            self.badge_asset_2.value = badge_id
        elif milestone_level == UInt64(3):
            assert user_bal >= self.milestone_3.value
            badge_id = self._mint_badge(Bytes(b"Vault Master"), Bytes(b"VM3"), Bytes(b"ipfs://QmBadge3"))
            self.badge_asset_3.value = badge_id
        self.user_milestone[Txn.sender] = milestone_level
        return badge_id

    @arc4.abimethod
    def withdraw(self, amount: UInt64, penalty_sink: Account) -> None:
        assert self.user_total[Txn.sender] >= amount
        penalty = UInt64(0)
        if (
            self.lock_enabled[Txn.sender] == UInt64(1)
            and self.user_total[Txn.sender] < self.user_goal_amount[Txn.sender]
        ):
            assert penalty_sink.bytes == self.penalty_sink[Txn.sender]
            penalty = (amount * self.user_penalty_bps[Txn.sender]) // UInt64(10_000)
            if penalty > UInt64(0):
                assert amount > penalty
                itxn.Payment(receiver=penalty_sink, amount=penalty, fee=0).submit()

        self.user_total[Txn.sender] -= amount
        self.total_deposited.value -= amount
        itxn.Payment(receiver=Txn.sender, amount=amount - penalty, fee=0).submit()

    @arc4.abimethod
    def setup_savings_pact(
        self,
        partner: Account,
        required_amount: UInt64,
        cadence_seconds: UInt64,
        penalty_amount: UInt64,
    ) -> None:
        assert partner.bytes != Txn.sender.bytes
        assert required_amount >= UInt64(1_000_000)
        assert cadence_seconds >= UInt64(86_400)
        assert penalty_amount > UInt64(0)
        self.pact_user_a.value = Txn.sender.bytes
        self.pact_user_b.value = partner.bytes
        self.pact_required_amount.value = required_amount
        self.pact_cadence_seconds.value = cadence_seconds
        self.pact_penalty_amount.value = penalty_amount
        self.pact_enabled.value = UInt64(1)

    @arc4.abimethod
    def apply_pact_penalty(self, partner: Account, penalty_payment: gtxn.PaymentTransaction) -> UInt64:
        assert self.pact_enabled.value == UInt64(1)
        assert penalty_payment.receiver == Global.current_application_address
        assert penalty_payment.sender == Txn.sender
        assert penalty_payment.amount >= self.pact_penalty_amount.value
        assert self._is_valid_pact_pair(Txn.sender, partner) == UInt64(1)
        assert Global.latest_timestamp > self.last_deposit[Txn.sender] + self.pact_cadence_seconds.value
        self.user_total[partner] += penalty_payment.amount
        self.total_deposited.value += penalty_payment.amount
        self.user_streak[Txn.sender] = UInt64(0)
        return penalty_payment.amount

    @arc4.abimethod
    def set_temptation_lock(self, goal_amount: UInt64, penalty_bps: UInt64, penalty_sink: Account) -> None:
        assert goal_amount > UInt64(0)
        assert penalty_bps <= UInt64(5000)
        self.lock_enabled[Txn.sender] = UInt64(1)
        self.user_goal_amount[Txn.sender] = goal_amount
        self.user_penalty_bps[Txn.sender] = penalty_bps
        self.penalty_sink[Txn.sender] = penalty_sink.bytes

    @arc4.abimethod
    def disable_temptation_lock(self) -> None:
        self.lock_enabled[Txn.sender] = UInt64(0)

    @arc4.abimethod
    def set_dream_board(self, dream_uri: Bytes, dream_title: Bytes) -> None:
        self.dream_uri[Txn.sender] = dream_uri
        self.dream_title[Txn.sender] = dream_title

    @arc4.abimethod(readonly=True)
    def get_user_stats(self, user: Account) -> arc4.Tuple[arc4.UInt64, arc4.UInt64, arc4.UInt64]:
        return arc4.Tuple((arc4.UInt64(self.user_total[user]), arc4.UInt64(self.user_milestone[user]), arc4.UInt64(self.user_streak[user])))

    @arc4.abimethod(readonly=True)
    def get_global_stats(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64]:
        return arc4.Tuple((arc4.UInt64(self.total_deposited.value), arc4.UInt64(self.total_users.value)))

    @arc4.abimethod(readonly=True)
    def get_pact_config(self) -> arc4.Tuple[arc4.UInt64, arc4.UInt64, arc4.UInt64, arc4.UInt64]:
        return arc4.Tuple((
            arc4.UInt64(self.pact_enabled.value),
            arc4.UInt64(self.pact_required_amount.value),
            arc4.UInt64(self.pact_cadence_seconds.value),
            arc4.UInt64(self.pact_penalty_amount.value),
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
    def _is_valid_pact_pair(self, sender: Account, partner: Account) -> UInt64:
        if sender.bytes == self.pact_user_a.value and partner.bytes == self.pact_user_b.value:
            return UInt64(1)
        if sender.bytes == self.pact_user_b.value and partner.bytes == self.pact_user_a.value:
            return UInt64(1)
        return UInt64(0)

    @subroutine
    def _mint_badge(self, name: Bytes, unit: Bytes, url: Bytes) -> UInt64:
        result = itxn.AssetConfig(total=1, decimals=0, asset_name=name, unit_name=unit, url=url, manager=Global.current_application_address, fee=0).submit()
        return result.created_asset.id
