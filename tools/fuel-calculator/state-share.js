const PARAM_KEYS = {
  nodes: 'nodes',
  stabilityHours: 'stability',
  reserveHours: 'reserve',
  deliveryDelayHours: 'delay',
  availableFuel: 'fuel',
  tripCapacity: 'capacity',
  tripTurnaroundHours: 'turnaround',
  haulerCount: 'haulers',
};

function setIfPresent(params, key, value) {
  if (typeof value !== 'string') {
    return;
  }

  if (value.trim() === '') {
    return;
  }

  params.set(key, value);
}

export function buildShareUrl(formState, baseUrl) {
  const url = new URL(baseUrl);
  const params = new URLSearchParams();

  setIfPresent(params, PARAM_KEYS.nodes, formState.nodes);
  setIfPresent(params, PARAM_KEYS.stabilityHours, formState.stabilityHours);
  setIfPresent(params, PARAM_KEYS.reserveHours, formState.reserveHours);
  setIfPresent(params, PARAM_KEYS.deliveryDelayHours, formState.deliveryDelayHours);
  setIfPresent(params, PARAM_KEYS.availableFuel, formState.availableFuel);
  setIfPresent(params, PARAM_KEYS.tripCapacity, formState.tripCapacity);
  setIfPresent(params, PARAM_KEYS.tripTurnaroundHours, formState.tripTurnaroundHours);
  setIfPresent(params, PARAM_KEYS.haulerCount, formState.haulerCount);

  url.search = params.toString();
  return url.toString();
}

export function parseShareState(urlOrHref) {
  const url = new URL(urlOrHref);
  const params = url.searchParams;

  return {
    nodes: params.get(PARAM_KEYS.nodes) ?? '',
    stabilityHours: params.get(PARAM_KEYS.stabilityHours) ?? '',
    reserveHours: params.get(PARAM_KEYS.reserveHours) ?? '',
    deliveryDelayHours: params.get(PARAM_KEYS.deliveryDelayHours) ?? '',
    availableFuel: params.get(PARAM_KEYS.availableFuel) ?? '',
    tripCapacity: params.get(PARAM_KEYS.tripCapacity) ?? '',
    tripTurnaroundHours: params.get(PARAM_KEYS.tripTurnaroundHours) ?? '',
    haulerCount: params.get(PARAM_KEYS.haulerCount) ?? '',
  };
}
