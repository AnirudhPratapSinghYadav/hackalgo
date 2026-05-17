import logging
import os

import algokit_utils

logger = logging.getLogger(__name__)


def deploy() -> None:
    from smart_contracts.artifacts.community_donation_hub.community_donation_hub_client import (
        CommunityDonationHubClient,
        CommunityDonationHubFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer = algorand.account.from_environment("DEPLOYER")
    factory = algorand.client.get_typed_app_factory(CommunityDonationHubFactory, default_sender=deployer.address)
    app_client, _ = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )
    logger.info("CommunityDonationHub deployed — App ID: %s", app_client.app_id)
    app_client.send.bootstrap(args=(deployer.address,))
    logger.info("Admin set to deployer: %s", deployer.address)
    logger.info("Set VITE_APPEALS_APP_ID=%s and VITE_ADMIN_ADDRESS=%s", app_client.app_id, deployer.address)
