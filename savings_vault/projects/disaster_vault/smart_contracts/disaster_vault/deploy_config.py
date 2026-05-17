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
    from smart_contracts.artifacts.disaster_vault.disaster_vault_client import (
        DisasterVaultClient,
        DisasterVaultFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")
    treasury = os.getenv("TREASURY_ADDRESS", deployer.address)

    existing_app_id = _get_env_int("EXISTING_APP_ID")
    if existing_app_id and existing_app_id > 0:
        app_client = algorand.client.get_typed_app_client_by_id(
            DisasterVaultClient, app_id=existing_app_id, default_sender=deployer.address
        )
        logger.info("Using existing DisasterVault app ID: %s", app_client.app_id)
        return

    factory = algorand.client.get_typed_app_factory(DisasterVaultFactory, default_sender=deployer.address)
    app_client, _ = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    logger.info("DisasterVault deployed — App ID: %s", app_client.app_id)

    try:
        app_client.send.bootstrap(
            args={"admin": deployer.address, "treasury": treasury},
        )
        logger.info("bootstrap(admin=%s, treasury=%s)", deployer.address, treasury)
    except Exception as e:
        logger.warning("bootstrap may already be set: %s", e)

    logger.info("Set VITE_DISASTER_APP_ID=%s", app_client.app_id)
    logger.info("Set VITE_ADMIN_ADDRESS=%s", deployer.address)
