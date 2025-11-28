const asyncWrapper = require('../../middleware/asyncWrapper');
const ErrorResponse = require('../../utils/ErrorResponse');
const http = require('http');
const https = require('https');

// @desc      Check health status of an app URL
// @route     POST /api/apps/health-check
// @access    Public
const checkHealth = asyncWrapper(async (req, res, next) => {
  const { url } = req.body;

  if (!url) {
    return next(new ErrorResponse('URL is required', 400));
  }

  try {
    const status = await pingUrl(url);
    res.status(200).json({
      success: true,
      data: {
        url,
        status,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        url,
        status: 'offline',
        error: error.message,
        checkedAt: new Date().toISOString(),
      },
    });
  }
});

// @desc      Check health status of multiple app URLs
// @route     POST /api/apps/health-check/batch
// @access    Public
const checkHealthBatch = asyncWrapper(async (req, res, next) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return next(new ErrorResponse('URLs array is required', 400));
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const status = await pingUrl(url);
        return {
          url,
          status,
          checkedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          url,
          status: 'offline',
          error: error.message,
          checkedAt: new Date().toISOString(),
        };
      }
    })
  );

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * Ping a URL and return its status
 * @param {string} url - The URL to ping
 * @returns {Promise<string>} - 'online' or 'offline'
 */
function pingUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const timeout = 5000; // 5 second timeout

      const req = protocol.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname || '/',
          method: 'HEAD',
          timeout,
          rejectUnauthorized: false, // Allow self-signed certificates
        },
        (response) => {
          // Consider any response (including redirects) as online
          // Status codes 2xx, 3xx are definitely online
          // Even 4xx means the server is responding
          if (response.statusCode < 500) {
            resolve('online');
          } else {
            resolve('offline');
          }
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { checkHealth, checkHealthBatch };
