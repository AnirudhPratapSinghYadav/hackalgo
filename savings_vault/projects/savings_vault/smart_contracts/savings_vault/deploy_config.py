import logging
import algokit_utils

logger = logging.getLogger(__name__)

def deploy() -> None:
    from smart_contracts.artifacts.savings_vault.savings_vault_client import (
        SavingsVaultFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_ = algorand.account.from_environment("DEPLOYER")

    factory = algorand.client.get_typed_app_factory(
        SavingsVaultFactory, default_sender=deployer_.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    logger.info(f"SavingsVault deployed! App ID: {app_client.app_id}")
    logger.info(f"App Address: {app_client.app_address}")