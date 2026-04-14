const fs = require('fs');
const path = require('path');

const ROUTES_INDEX_PATH = path.join(__dirname, '..', 'routes', 'index.js');
const ROUTES_DIR = path.join(__dirname, '..', 'routes', 'v1');
const DOCS_SCOPES = new Set(['full', 'public', 'off']);
const PUBLIC_ROUTE_GROUPS = new Set([
    'auth',
    'banner',
    'blog',
    'contact',
    'coupon',
    'location',
    'newsletter',
    'product',
    'review',
    'settings',
    'shipping',
]);

const TAG_METADATA = {
    address: {
        name: 'Addresses',
        description: 'Customer shipping address management endpoints.',
    },
    admin: {
        name: 'Admin',
        description: 'Back-office management endpoints for admin users.',
    },
    auth: {
        name: 'Authentication',
        description: 'Registration, login, OTP, password, and social auth endpoints.',
    },
    banner: {
        name: 'Banners',
        description: 'Public banner endpoints for storefront content.',
    },
    blog: {
        name: 'Blogs',
        description: 'Blog listing and blog detail endpoints.',
    },
    chat: {
        name: 'Chat',
        description: 'AI stylist chat, voice, and chat history endpoints.',
    },
    contact: {
        name: 'Contact',
        description: 'Contact form submission endpoints.',
    },
    coupon: {
        name: 'Coupons',
        description: 'Coupon discovery, validation, and customer coupon endpoints.',
    },
    location: {
        name: 'Locations',
        description: 'Province, district, and location search endpoints.',
    },
    newsletter: {
        name: 'Newsletter',
        description: 'Newsletter subscription management endpoints.',
    },
    notification: {
        name: 'Notifications',
        description: 'User and admin notification endpoints.',
    },
    order: {
        name: 'Orders',
        description: 'Order creation, history, and cancellation endpoints.',
    },
    payment: {
        name: 'Payments',
        description: 'Payment gateway callbacks and payment session creation endpoints.',
    },
    product: {
        name: 'Products',
        description: 'Product catalog, filtering, and product detail endpoints.',
    },
    review: {
        name: 'Reviews',
        description: 'Product review listing, creation, and moderation endpoints.',
    },
    settings: {
        name: 'Settings',
        description: 'Public storefront settings endpoints.',
    },
    shipping: {
        name: 'Shipping',
        description: 'Shipping rate and shipping fee calculation endpoints.',
    },
    user: {
        name: 'Users',
        description: 'Authenticated user profile and account history endpoints.',
    },
    wishlist: {
        name: 'Wishlist',
        description: 'Wishlist management endpoints for authenticated customers.',
    },
};

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function getMountMap() {
    const source = readFile(ROUTES_INDEX_PATH);
    const requireMap = new Map();
    const mountMap = new Map();

    const requirePattern = /const\s+(\w+)\s*=\s*require\('\.\/v1\/([^']+)'\);/g;
    const mountPattern = /router\.use\('([^']+)',\s*(\w+)\);/g;

    let requireMatch;
    while ((requireMatch = requirePattern.exec(source)) !== null) {
        requireMap.set(requireMatch[1], `${requireMatch[2]}.js`);
    }

    let mountMatch;
    while ((mountMatch = mountPattern.exec(source)) !== null) {
        const fileName = requireMap.get(mountMatch[2]);
        if (fileName) {
            mountMap.set(fileName, mountMatch[1]);
        }
    }

    return mountMap;
}

function joinApiPath(prefix, routePath) {
    const prefixPart = prefix === '/' ? '' : prefix.replace(/\/+$/, '');
    const routePart = routePath === '/' ? '' : routePath;
    const rawPath = `/api/v1${prefixPart}${routePart}`;

    return rawPath.replace(/\/+/g, '/');
}

function toOpenApiPath(expressPath) {
    return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function getPathParameters(openApiPath) {
    const matches = [...openApiPath.matchAll(/\{([A-Za-z0-9_]+)\}/g)];

    return matches.map((match) => ({
        name: match[1],
        in: 'path',
        required: true,
        description: `Path parameter: ${match[1]}.`,
        schema: {
            type: 'string',
        },
    }));
}

function detectUploadRequest(line) {
    const singleMatch = line.match(/\.single\('([^']+)'\)/);
    if (singleMatch) {
        return {
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            [singleMatch[1]]: {
                                type: 'string',
                                format: 'binary',
                            },
                        },
                        required: [singleMatch[1]],
                    },
                },
            },
        };
    }

    const arrayMatch = line.match(/\.array\('([^']+)'\s*,\s*(\d+)\)/);
    if (arrayMatch) {
        return {
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: {
                            [arrayMatch[1]]: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                    format: 'binary',
                                },
                                maxItems: Number(arrayMatch[2]),
                            },
                        },
                        required: [arrayMatch[1]],
                    },
                },
            },
        };
    }

    return {
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    additionalProperties: true,
                },
                example: {},
            },
        },
    };
}

function buildSummary(method, openApiPath) {
    return `${method.toUpperCase()} ${openApiPath}`;
}

function buildOperationId(method, openApiPath) {
    const normalized = openApiPath
        .replace(/[{}]/g, '')
        .replace(/\/+/g, '_')
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '');

    return `${method}${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function getRouteFiles() {
    return fs.readdirSync(ROUTES_DIR).filter((file) => file.endsWith('.routes.js'));
}

function normalizeDocsScope(scope) {
    return DOCS_SCOPES.has(scope) ? scope : 'full';
}

function buildGeneratedPaths(scope = 'full') {
    const normalizedScope = normalizeDocsScope(scope);
    const mountMap = getMountMap();
    const paths = {};
    const tagsInUse = new Set();

    for (const fileName of getRouteFiles()) {
        const baseName = fileName.replace('.routes.js', '');
        const tagInfo = TAG_METADATA[baseName];
        if (!tagInfo) {
            continue;
        }
        if (normalizedScope === 'public' && !PUBLIC_ROUTE_GROUPS.has(baseName)) {
            continue;
        }

        const prefix = mountMap.get(fileName) || '/';
        const filePath = path.join(ROUTES_DIR, fileName);
        const source = readFile(filePath);
        const lines = source.split(/\r?\n/);
        const globalProtected = /router\.use\(protect\);/.test(source);
        const globalAdminOnly = /router\.use\(adminOnly\);/.test(source);

        for (const line of lines) {
            const match = line.match(/router\.(get|post|put|patch|delete)\('([^']+)'/);
            if (!match) {
                continue;
            }

            const method = match[1];
            const routePath = match[2];
            const openApiPath = toOpenApiPath(joinApiPath(prefix, routePath));
            const isProtected = (globalProtected || /\bprotect\b/.test(line)) && !/\boptionalAuth\b/.test(line);
            const isAdminOnly = globalAdminOnly || /\badminOnly\b/.test(line);
            const isUploadRoute = /\.single\(|\.array\(/.test(line);
            const descriptionParts = [`Source file: ${fileName}.`];

            if (normalizedScope === 'public' && (isProtected || isAdminOnly)) {
                continue;
            }

            if (isAdminOnly) {
                descriptionParts.push('Requires an authenticated admin user.');
            } else if (isProtected) {
                descriptionParts.push('Requires a bearer access token.');
            } else if (/\boptionalAuth\b/.test(line)) {
                descriptionParts.push('Accepts an optional bearer access token.');
            }

            if (isUploadRoute) {
                descriptionParts.push('Consumes multipart form data.');
            }

            if (!paths[openApiPath]) {
                paths[openApiPath] = {};
            }

            const responses = {
                200: {
                    description: 'Successful response.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/SuccessEnvelope',
                            },
                        },
                    },
                },
                400: {
                    description: 'Bad request.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                404: {
                    description: 'Resource not found.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
                500: {
                    description: 'Internal server error.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                },
            };

            if (isProtected || isAdminOnly) {
                responses[401] = {
                    description: 'Authentication required or token invalid.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                };
            }

            if (isAdminOnly) {
                responses[403] = {
                    description: 'Admin role required.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/ErrorResponse',
                            },
                        },
                    },
                };
            }

            const operation = {
                tags: [tagInfo.name],
                summary: buildSummary(method, openApiPath),
                description: descriptionParts.join(' '),
                operationId: buildOperationId(method, openApiPath),
                parameters: getPathParameters(openApiPath),
                responses,
            };

            if (isProtected || isAdminOnly) {
                operation.security = [{ bearerAuth: [] }];
            }

            if (['post', 'put', 'patch'].includes(method)) {
                operation.requestBody = detectUploadRequest(line);
            }

            paths[openApiPath][method] = operation;
            tagsInUse.add(baseName);
        }
    }

    return {
        paths,
        tags: Object.keys(TAG_METADATA)
            .filter((key) => tagsInUse.has(key))
            .map((key) => ({
                name: TAG_METADATA[key].name,
                description: TAG_METADATA[key].description,
            })),
    };
}

function getServerUrl(req) {
    if (!req) {
        return '/';
    }

    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host');

    return host ? `${protocol}://${host}` : '/';
}

function buildOpenApiSpec(req, options = {}) {
    const docsScope = normalizeDocsScope(options.scope);
    const generated = buildGeneratedPaths(docsScope);
    const modeDescription = docsScope === 'full'
        ? 'This document includes both public and protected endpoints.'
        : 'This document includes only public endpoints intended for demonstration.';

    return {
        openapi: '3.0.3',
        info: {
            title: 'AURA ARCHIVE API',
            version: '1.0.0',
            description: `OpenAPI documentation for the current Express backend powering AURA ARCHIVE. ${modeDescription}`,
        },
        servers: [
            {
                url: getServerUrl(req),
                description: 'Current server',
            },
        ],
        tags: [
            {
                name: 'System',
                description: 'Root and health-check endpoints for the running API server.',
            },
            ...generated.tags,
        ],
        paths: {
            '/': {
                get: {
                    tags: ['System'],
                    summary: 'API welcome endpoint',
                    operationId: 'getRoot',
                    description: 'Returns the API welcome payload.',
                    responses: {
                        200: {
                            description: 'Successful response.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/SuccessEnvelope',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Server health check',
                    operationId: 'getServerHealth',
                    description: 'Checks the overall Express server status.',
                    responses: {
                        200: {
                            description: 'Server is healthy.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/SuccessEnvelope',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/health': {
                get: {
                    tags: ['System'],
                    summary: 'API v1 health check',
                    operationId: 'getApiHealth',
                    description: 'Checks the v1 API router status.',
                    responses: {
                        200: {
                            description: 'API router is healthy.',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/SuccessEnvelope',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            ...generated.paths,
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                SuccessEnvelope: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true,
                        },
                        message: {
                            type: 'string',
                            nullable: true,
                            example: 'Request completed successfully.',
                        },
                        data: {
                            type: 'object',
                            nullable: true,
                            additionalProperties: true,
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                        },
                        status: {
                            type: 'string',
                            nullable: true,
                            example: 'fail',
                        },
                        message: {
                            type: 'string',
                            example: 'Something went wrong.',
                        },
                        errors: {
                            type: 'array',
                            nullable: true,
                            items: {
                                type: 'object',
                                additionalProperties: true,
                            },
                        },
                    },
                    required: ['success', 'message'],
                },
            },
        },
    };
}

module.exports = {
    buildOpenApiSpec,
    normalizeDocsScope,
};
