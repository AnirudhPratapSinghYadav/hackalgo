import os

import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.savings_vault.savings_vault_client import (
    SavingsVaultClient,
    SavingsVaultFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    mnemonic = os.getenv("DEPLOYER_MNEMONIC", "")
    if len(mnemonic.split()) != 25:
        pytest.skip("DEPLOYER_MNEMONIC is not configured with 25 words; skipping integration tests.")
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def savings_vault_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> SavingsVaultClient:
    factory = algorand_client.client.get_typed_app_factory(
        SavingsVaultFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_initial_global_state_is_zeroed(savings_vault_client: SavingsVaultClient) -> None:
    result = savings_vault_client.send.get_global_stats()
    total_deposited, total_users = result.abi_return
    assert total_deposited == 0
    assert total_users == 0


def test_opt_in_initializes_local_state(savings_vault_client: SavingsVaultClient, deployer: SigningAccount) -> None:
    savings_vault_client.send.opt_in.opt_in()
    result = savings_vault_client.send.get_user_stats(args=(deployer.address,))
    total_saved, milestone, streak = result.abi_return
    assert total_saved == 0
    assert milestone == 0
    assert streak == 0
