import { mapV7PublicOffer } from "../adapters/v7PublishedOfferAdapter.js";
import {
  benefitFetchFailure,
  benefitFetchSuccess,
} from "./fetchState.js";

export async function fetchPublishedV7Offers(client) {
  if (!client || typeof client.from !== "function") {
    return benefitFetchFailure(
      new Error("V7 published offer source is not configured"),
      "v7_public_offers"
    );
  }

  try {
    const { data, error } = await client
      .from("v7_public_offers")
      .select("*");

    if (error) throw error;

    const items = (data || []).map(mapV7PublicOffer);
    return benefitFetchSuccess(items, "v7_public_offers");
  } catch (error) {
    return benefitFetchFailure(error, "v7_public_offers");
  }
}
