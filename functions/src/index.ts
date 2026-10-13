import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({region: "europe-west1", maxInstances: 10});

export {
  getInvite,
  joinList,
  fetchLinkMeta,
  mergeGuest,
  exportMyData,
  deleteAccount,
  deleteList,
} from "./callables";
export {
  createPartnerInvite,
  revokePartnerInvite,
  getPartnerInvite,
  acceptPartnerInvite,
  removePartner,
} from "./partner";
export {
  onWishCreate,
  onWishUpdate,
  onWishDelete,
  onListUpdate,
} from "./triggers";
export {purgeAnonymous} from "./purge";
