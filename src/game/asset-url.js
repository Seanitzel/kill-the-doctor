// Runtime assets follow the build's mount path on Pages and stay local in Capacitor.
export function assetUrl(path) { return import.meta.env.BASE_URL + path.replace(/^\//, ''); }
