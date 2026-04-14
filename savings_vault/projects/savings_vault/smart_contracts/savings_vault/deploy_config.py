import logging
import os

import algokit_utils

logger = logging.getLogger(__name__)


def _get_env_int(name: str) -> int | None:
    v = os.getenv(name)
    if not v:
        return None
    try:
        return int(v.strip())
    except ValueError:
        return None


def deploy() -> None:
    """
    AlgoKit deployment entrypoint.

    This deploy script is intentionally environment-driven so it can run:
    - locally (LocalNet)
    - on TestNet
    - in CI / evaluation environments

    Required:
    - DEPLOYER (account/mnemonic via AlgoKit env convention)

    Optional:
    - EXISTING_APP_ID: if set, skip deploy and just print the app references
    """
    from smart_contracts.artifacts.savings_vault.savings_vault_client import SavingsVaultClient, SavingsVaultFactory

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")

    # Print network context (useful during evaluation logs)
    try:
        params = algorand.client.algod.suggested_params()
        logger.info("Algod network detected (genesis_hash): %s", getattr(params, "genesis_hash", None))
    except Exception:
        logger.info("Algod network detected (details unavailable)")

    existing_app_id = _get_env_int("EXISTING_APP_ID")
    if existing_app_id and existing_app_id > 0:
        app_client = algorand.client.get_typed_app_client_by_id(
            SavingsVaultClient, app_id=existing_app_id, default_sender=deployer.address
        )
        logger.info("Using existing SavingsVault app (no deploy)")
        logger.info("App ID: %s", app_client.app_id)
        logger.info("App Address: %s", app_client.app_address)
        return

    factory = algorand.client.get_typed_app_factory(SavingsVaultFactory, default_sender=deployer.address)

    app_client, _ = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    logger.info("SavingsVault deployed")
    logger.info("App ID: %s", app_client.app_id)
    logger.info("App Address: %s", app_client.app_address)