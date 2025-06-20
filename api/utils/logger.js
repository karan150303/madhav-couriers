function info() {
  console.log('[INFO]', ...arguments);
}

function error() {
  console.error('[ERROR]', ...arguments);
}

module.exports = {
  info,
  error
};
