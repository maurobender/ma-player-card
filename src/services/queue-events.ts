// Lets an open queue know that another card (the browser) changed it, since adding songs changes no player state.
export const QUEUE_EVENT = "ma-player-card-queue";
export interface QueueEventDetail {
  /** The player whose queue changed. */
  entity: string;
}

export const queueChanged = (entity: string): void => {
  window.dispatchEvent(new CustomEvent<QueueEventDetail>(QUEUE_EVENT, { detail: { entity } }));
};
