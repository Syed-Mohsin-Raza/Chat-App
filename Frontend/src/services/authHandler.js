let onUnauthorizedCallback = null;

export const registerUnauthorizedHandler = (callback) => {
  console.log('Registering unauthorized handler');
  onUnauthorizedCallback = callback;
};

export const getUnauthorizedHandler = () => onUnauthorizedCallback;