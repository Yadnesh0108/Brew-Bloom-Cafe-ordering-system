// ═══════════════════════════════════════════════════════════
//  Global error handler middleware
// ═══════════════════════════════════════════════════════════

function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Handle known error types
  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  if (err.name === 'CSRFError' || err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'Invalid form token. Please refresh and try again.' });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Default 500
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
}

// ── Catch unhandled promise rejections globally ────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
  // In production, you'd log to an external service here
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  // Give the server a moment to log, then exit
  setTimeout(() => process.exit(1), 1000);
});

module.exports = errorHandler;
