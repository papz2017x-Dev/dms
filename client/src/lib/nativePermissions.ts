export async function ensureCameraPermission(): Promise<boolean> {
  try {
    const w = window as any;

    // Capacitor (if present) - use dynamic access to avoid hard dependency
    if (w.Capacitor) {
      const Plugins = w.Capacitor.Plugins || w.Plugins || w.plugins;
      if (Plugins) {
        try {
          // Try Camera plugin requestPermissions / checkPermissions
          if (Plugins.Camera && typeof Plugins.Camera.requestPermissions === 'function') {
            const res = await Plugins.Camera.requestPermissions();
            if (res && (res.camera === 'granted' || res.camera === true)) return true;
          }
          if (Plugins.Camera && typeof Plugins.Camera.checkPermissions === 'function') {
            const res = await Plugins.Camera.checkPermissions();
            if (res && (res.camera === 'granted' || res.camera === true)) return true;
          }
          // Generic Permissions plugin
          if (Plugins.Permissions && typeof Plugins.Permissions.request === 'function') {
            const res = await Plugins.Permissions.request({ name: 'camera' });
            if (res && (res.camera === 'granted' || res.granted)) return true;
          }
        } catch (e) {
          console.warn('Capacitor permission flow failed', e);
          // Fallthrough to return true so web flow can continue if plugin APIs differ
          return true;
        }
      }
    }

    // Cordova (if present)
    if (w.cordova && w.cordova.plugins && w.cordova.plugins.permissions) {
      const perms = w.cordova.plugins.permissions;
      return new Promise((resolve) => {
        perms.requestPermission(perms.CAMERA, (status: any) => {
          if (!status) return resolve(false);
          // status may be object or boolean
          if (typeof status === 'object') return resolve(!!status.hasPermission || !!status.permission || status === 'OK');
          return resolve(!!status);
        }, () => resolve(false));
      });
    }

    // Browser: file input or getUserMedia will trigger permission prompts as needed
    return true;
  } catch (e) {
    console.error('ensureCameraPermission error', e);
    return false;
  }
}

export default ensureCameraPermission;
