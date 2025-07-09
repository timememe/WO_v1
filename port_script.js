document.addEventListener('DOMContentLoaded', function() {
    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB); // Sky blue
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // Game settings
    const gameSettings = {
        movement: {
            forwardSpeed: 3.0,
            playerSpeed: 20,
            playerInertia: 0.85,
            maxPlayerOffset: 75
        },
        obstacles: {
            poolSize: 30,        // Object pool size
            activeCount: 15,     // How many active at once
            spawnDistance: 620, // Distance ahead to spawn
            despawnDistance: 100, // Distance behind camera to despawn
            baseSpeed: 300,      // Base speed when far away
            maxSpeed: 1200,       // Maximum speed when very close
            accelerationDistance: 600, // Distance at which acceleration starts
            sizeRange: { min: 20, max: 120 },
            spawnRate: 0.03      // Probability of spawning per frame
        },
        cloudGenerator: {
            canvasSize: 128,      // Size of generated cloud texture
            pixelSize: 12,        // Size of each "pixel" in the cloud
            density: 0.9,        // Cloud density (0-1)
            softness: 0.3,       // Edge softness (0-1)
            colorVariation: 0.2, // Color variation between clouds
            baseColors: [        // Base cloud colors
                { r: 255, g: 255, b: 255 }, // White
                { r: 240, g: 248, b: 255 }, // Alice blue
                { r: 230, g: 230, b: 250 }, // Lavender
                { r: 248, g: 248, b: 255 }  // Ghost white
            ]
        },
        landscape: {
            zPosition: -2000,  // Global Z coordinate for landscape positioning
            width: 4000,       // Width of the landscape plane
            height: 4000       // Height of the landscape plane
        },
        cloudLayer: {
            zPosition: -1300,   // Z position (closer to camera for visibility)
            width: 2000,       // Larger coverage area
            height: 2000,     // Slightly larger scale
            opacity: 0.9
        },
        specialObject: {
            startPosition: { x: 0, y: 100, z: -800 },  // Starting coordinates
            stopDistance: 300,                        // Distance from camera to stop
            pauseDuration: 3000,                      // Time to pause in milliseconds
            speed: 150,                              // Movement speed
            size: 60,                                // Object size
            color: 0xff6b6b                          // Object color (red-ish)
        },
        windTrail: {
            lineCount: 15,          // Number of speed lines
            spawnRate: 0.8,         // Probability of spawning new lines per frame
            color: 0xffffff,        // White speed lines
            fadeSpeed: 0.02,        // How fast lines fade out
            speed: 4,               // How fast lines move outward from center
            centerRadius: 10,       // Inner radius (dead zone around center)
            maxRadius: 300,         // Maximum distance from center
            lineWidth: 4,           // Line thickness
            opacity: 1.0            // Base opacity of lines
        }
    };
    
    // Game state
    const game = {
        player: {
            object: null,
            velocity: new THREE.Vector3(0, 0, 0)
        },
        obstacles: {
            pool: [],           // Object pool
            active: [],         // Currently active obstacles
            inactive: []        // Available for reuse
        },
        landscape: null,        // Reference to landscape object
        cloudLayer: null,       // Reference to cloud layer
        specialObject: {
            mesh: null,
            active: false,
            moving: false,
            paused: false,
            pauseStartTime: 0
        },
        windTrail: {
            lines: [],              // Array of wind line objects
            positionHistory: []     // Player position history for trail
        },
        playerAnimation: {
            textures: [],           // Array of loaded frame textures
            currentFrame: 0,        // Current animation frame
            frameCount: 8,          // Total number of frames
            frameRate: 30,          // Frames per second
            lastFrameTime: 0,       // Time tracking for frame switching
            direction: 1,           // Animation direction: 1 = forward, -1 = backward
            pingPong: true          // Enable ping-pong animation
        },
        keys: {},
        touch: {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            isDragging: true,
            sensitivity: 0.1    // Touch sensitivity multiplier
        },
        loader: new THREE.TextureLoader()
    };
    
    // Set up camera position
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -100);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 100, 100);
    scene.add(directionalLight);
    
    // Create background
    function createBackground() {
        game.loader.load('port_assets/landscape.png', function(texture) {
            // Create vertical plane as backdrop - single texture, no tiling
            const geometry = new THREE.PlaneGeometry(gameSettings.landscape.width, gameSettings.landscape.height);
            
            const material = new THREE.MeshBasicMaterial({ 
                map: texture,
                side: THREE.FrontSide
            });
            
            const background = new THREE.Mesh(geometry, material);
            // Position using global Z coordinate
            background.position.set(0, 0, gameSettings.landscape.zPosition);
            
            // Store reference for easy access
            game.landscape = background;
            scene.add(background);
            
            console.log(`Landscape positioned at Z: ${gameSettings.landscape.zPosition}`);
        }, undefined, function() {
            console.warn('Background texture failed to load, using color background');
        });
    }
    
    // Load animation frames
    async function loadPlayerFrames() {
        const promises = [];
        
        for (let i = 1; i <= game.playerAnimation.frameCount; i++) {
            const promise = new Promise((resolve, reject) => {
                game.loader.load(`port_assets/anim_me/${i}.png`, resolve, undefined, reject);
            });
            promises.push(promise);
        }
        
        try {
            game.playerAnimation.textures = await Promise.all(promises);
            console.log(`Loaded ${game.playerAnimation.textures.length} animation frames`);
            return true;
        } catch (error) {
            console.warn('Failed to load some animation frames:', error);
            return false;
        }
    }
    
    // Create player sprite with frame animation
    async function createPlayer() {
        // Try to load animation frames first
        const framesLoaded = await loadPlayerFrames();
        
        if (framesLoaded && game.playerAnimation.textures.length > 0) {
            // Create player with first frame
            const geometry = new THREE.PlaneGeometry(20, 20);
            const material = new THREE.MeshBasicMaterial({ 
                map: game.playerAnimation.textures[0],
                transparent: true,
                alphaTest: 0.1
            });
            
            const player = new THREE.Mesh(geometry, material);
            player.position.set(0, 0, -50);
            
            game.player.object = player;
            scene.add(player);
            
            console.log('Player created with frame animation');
        } else {
            // Fallback to colored square if frames fail to load
            console.warn('Animation frames failed to load, using colored fallback');
            
            const geometry = new THREE.PlaneGeometry(10, 10);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xe74c3c,
                transparent: true,
                opacity: 0.9
            });
            
            const player = new THREE.Mesh(geometry, material);
            player.position.set(0, 0, -50);
            
            game.player.object = player;
            scene.add(player);
        }
    }
    
    // Update player animation
    function updatePlayerAnimation() {
        const player = game.player.object;
        if (!player || game.playerAnimation.textures.length === 0) return;
        
        const currentTime = Date.now();
        const frameInterval = 1000 / game.playerAnimation.frameRate;
        
        // Check if it's time to switch frames
        if (currentTime - game.playerAnimation.lastFrameTime >= frameInterval) {
            if (game.playerAnimation.pingPong) {
                // Ping-pong animation logic
                game.playerAnimation.currentFrame += game.playerAnimation.direction;
                
                // Check bounds and reverse direction if needed
                if (game.playerAnimation.currentFrame >= game.playerAnimation.frameCount - 1) {
                    game.playerAnimation.currentFrame = game.playerAnimation.frameCount - 1;
                    game.playerAnimation.direction = -1; // Start going backward
                } else if (game.playerAnimation.currentFrame <= 0) {
                    game.playerAnimation.currentFrame = 0;
                    game.playerAnimation.direction = 1; // Start going forward
                }
            } else {
                // Standard loop animation
                game.playerAnimation.currentFrame = (game.playerAnimation.currentFrame + 1) % game.playerAnimation.frameCount;
            }
            
            // Update texture
            player.material.map = game.playerAnimation.textures[game.playerAnimation.currentFrame];
            player.material.needsUpdate = true;
            
            // Update frame time
            game.playerAnimation.lastFrameTime = currentTime;
        }
    }
    
    // Create special object
    function createSpecialObject() {
        const geometry = new THREE.PlaneGeometry(gameSettings.specialObject.size, gameSettings.specialObject.size);
        const material = new THREE.MeshBasicMaterial({ 
            color: gameSettings.specialObject.color,
            transparent: true,
            opacity: 0.8
        });
        
        const specialObject = new THREE.Mesh(geometry, material);
        
        // Set initial position
        specialObject.position.set(
            gameSettings.specialObject.startPosition.x,
            gameSettings.specialObject.startPosition.y,
            gameSettings.specialObject.startPosition.z
        );
        
        // Make it visible and active
        specialObject.visible = true;
        game.specialObject.mesh = specialObject;
        game.specialObject.active = true;
        game.specialObject.moving = true;
        game.specialObject.paused = false;
        
        scene.add(specialObject);
        
        console.log('Special object created at:', specialObject.position);
    }
    
    // Create wind trail system
    function createWindTrail() {
        // Initialize position history array
        game.windTrail.positionHistory = [];
        game.windTrail.lines = [];
        
        console.log('Wind trail system initialized');
    }
    
    // Create individual wind line
    function createWindLine(startPos, endPos, opacity = 1.0) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            startPos.x, startPos.y, startPos.z,
            endPos.x, endPos.y, endPos.z
        ]);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: gameSettings.windTrail.color,
            transparent: true,
            opacity: opacity
        });
        
        const line = new THREE.Line(geometry, material);
        return line;
    }
    
    // Update anime-style speed lines
    function updateWindTrail() {
        const player = game.player.object;
        if (!player) return;
        
        // Create new speed lines
        if (Math.random() < gameSettings.windTrail.spawnRate) {
            // Random angle for radial distribution
            const angle = Math.random() * Math.PI * 2;
            
            // Start near center of screen (relative to player, not camera)
            const startDistance = gameSettings.windTrail.centerRadius;
            
            // Calculate positions relative to player
            const startPos = {
                x: player.position.x + Math.cos(angle) * startDistance,
                y: player.position.y + Math.sin(angle) * startDistance,
                z: player.position.z - 20 // Behind player
            };
            
            // End position much further out in same direction
            const endDistance = startDistance + 80;
            const endPos = {
                x: player.position.x + Math.cos(angle) * endDistance,
                y: player.position.y + Math.sin(angle) * endDistance,
                z: startPos.z
            };
            
            const speedLine = createWindLine(startPos, endPos, gameSettings.windTrail.opacity);
            
            speedLine.userData = {
                life: 1.0,
                maxLife: 1.0,
                angle: angle,
                currentDistance: startDistance,
                speed: gameSettings.windTrail.speed,
                playerStartX: player.position.x,
                playerStartY: player.position.y,
                playerStartZ: player.position.z
            };
            
            game.windTrail.lines.push(speedLine);
            scene.add(speedLine);
            
            //console.log('Speed line created at angle:', angle, 'distance:', startDistance);
        }
        
        // Update existing speed lines
        game.windTrail.lines.forEach((line, index) => {
            const userData = line.userData;
            
            // Move line outward from original center
            userData.currentDistance += userData.speed;
            
            // Update geometry positions
            const positions = line.geometry.attributes.position.array;
            
            // Start point
            const startDist = userData.currentDistance;
            positions[0] = userData.playerStartX + Math.cos(userData.angle) * startDist;
            positions[1] = userData.playerStartY + Math.sin(userData.angle) * startDist;
            positions[2] = userData.playerStartZ - 20;
            
            // End point
            const endDist = userData.currentDistance + 60;
            positions[3] = userData.playerStartX + Math.cos(userData.angle) * endDist;
            positions[4] = userData.playerStartY + Math.sin(userData.angle) * endDist;
            positions[5] = userData.playerStartZ - 20;
            
            line.geometry.attributes.position.needsUpdate = true;
            
            // Fade out as line moves away from center
            userData.life -= gameSettings.windTrail.fadeSpeed;
            line.material.opacity = Math.max(0.1, userData.life * gameSettings.windTrail.opacity);
            
            // Remove if faded out or too far from center
            if (userData.life <= 0 || userData.currentDistance > gameSettings.windTrail.maxRadius) {
                scene.remove(line);
                line.geometry.dispose();
                line.material.dispose();
                game.windTrail.lines.splice(index, 1);
            }
        });
        
        // Debug info
        if (game.windTrail.lines.length > 0 && Math.random() < 0.01) {
            //console.log('Active speed lines:', game.windTrail.lines.length);
        }
    }
    
    // Simple noise function for cloud generation
    function noise(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
        return n - Math.floor(n);
    }
    
    
    // Improved Perlin-like noise function (keeping original for compatibility)
    function perlinNoise(x, y, scale = 1, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += noise(x * frequency, y * frequency, i * 100) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
    
    // Generate pixel cloud texture
    function generatePixelCloud(seed = Math.random()) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = gameSettings.cloudGenerator.canvasSize;
        const pixelSize = gameSettings.cloudGenerator.pixelSize;
        const gridSize = size / pixelSize;
        
        canvas.width = size;
        canvas.height = size;
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Choose base color for this cloud
        const baseColor = gameSettings.cloudGenerator.baseColors[
            Math.floor(Math.random() * gameSettings.cloudGenerator.baseColors.length)
        ];
        
        // Generate cloud shape
        const centerX = gridSize / 2;
        const centerY = gridSize / 2;
        const maxRadius = gridSize * 0.4;
        
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                // Distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Base cloud shape (circular with some noise)
                let cloudValue = 1 - (distance / maxRadius);
                
                // Add noise for organic shape
                const noiseValue1 = noise(x * 0.1, y * 0.1, seed);
                const noiseValue2 = noise(x * 0.2, y * 0.2, seed + 100);
                const noiseValue3 = noise(x * 0.4, y * 0.4, seed + 200);
                
                cloudValue += (noiseValue1 - 0.5) * 0.3;
                cloudValue += (noiseValue2 - 0.5) * 0.2;
                cloudValue += (noiseValue3 - 0.5) * 0.1;
                
                // Apply density and softness
                cloudValue = (cloudValue - (1 - gameSettings.cloudGenerator.density)) / gameSettings.cloudGenerator.softness;
                cloudValue = Math.max(0, Math.min(1, cloudValue));
                
                // Pixelize the value
                cloudValue = Math.round(cloudValue * 4) / 4;
                
                if (cloudValue > 0) {
                    // Calculate color with variation
                    const variation = (Math.random() - 0.5) * gameSettings.cloudGenerator.colorVariation;
                    const r = Math.max(0, Math.min(255, baseColor.r + variation * 255));
                    const g = Math.max(0, Math.min(255, baseColor.g + variation * 255));
                    const b = Math.max(0, Math.min(255, baseColor.b + variation * 255));
                    
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${cloudValue})`;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.NearestFilter; // Pixelated look
        texture.minFilter = THREE.NearestFilter;
        
        return texture;
    }
    
    
    // Create cloud layer background using texture file
    function createCloudLayer() {
        game.loader.load('port_assets/cloud1.png', function(texture) {
            // Create plane geometry
            const geometry = new THREE.PlaneGeometry(
                gameSettings.cloudLayer.width, 
                gameSettings.cloudLayer.height
            );
            
            // Create material with loaded texture
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: gameSettings.cloudLayer.opacity,
                side: THREE.FrontSide
            });
            
            // Create mesh
            const cloudLayer = new THREE.Mesh(geometry, material);
            cloudLayer.position.set(0, 0, gameSettings.cloudLayer.zPosition);
            
            // Store reference
            game.cloudLayer = cloudLayer;
            scene.add(cloudLayer);
            
            console.log(`Cloud layer created at Z: ${gameSettings.cloudLayer.zPosition} using cloud1.png`);
        }, undefined, function() {
            console.warn('Cloud texture failed to load, skipping cloud layer');
        });
    }
    
    // Update cloud layer (slowly scroll for movement effect)
    function updateCloudLayer() {
        if (!game.cloudLayer) return;
        
        // Slowly scroll the texture for movement effect
        const time = Date.now() * 0.001;
        const scrollX = time * gameSettings.cloudLayer.scrollSpeed * 0.01;
        const scrollY = time * gameSettings.cloudLayer.scrollSpeed * 0.005;
        
        // Update texture offset
        game.cloudLayer.material.map.offset.x = scrollX;
        game.cloudLayer.material.map.offset.y = scrollY;
    }
    
    // Create obstacle sprite with generated cloud
    function createObstacleSprite() {
        return new Promise((resolve) => {
            try {
                // Generate unique pixel cloud texture
                const cloudTexture = generatePixelCloud();
                
                const size = gameSettings.obstacles.sizeRange.min + 
                           Math.random() * (gameSettings.obstacles.sizeRange.max - gameSettings.obstacles.sizeRange.min);
                
                const geometry = new THREE.PlaneGeometry(size, size);
                const material = new THREE.MeshBasicMaterial({ 
                    map: cloudTexture,
                    transparent: true,
                    opacity: 0.8,
                    alphaTest: 0.1
                });
                
                const obstacle = new THREE.Mesh(geometry, material);
                
                // Initialize obstacle data
                obstacle.userData = {
                    velocity: 0,
                    active: false,
                    originalSize: size
                };
                
                resolve(obstacle);
            } catch (error) {
                console.warn('Failed to generate pixel cloud, using fallback');
                
                // Fallback to colored plane
                const size = gameSettings.obstacles.sizeRange.min + 
                           Math.random() * (gameSettings.obstacles.sizeRange.max - gameSettings.obstacles.sizeRange.min);
                
                const geometry = new THREE.PlaneGeometry(size, size);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.6
                });
                
                const obstacle = new THREE.Mesh(geometry, material);
                obstacle.userData = {
                    velocity: 0,
                    active: false,
                    originalSize: size
                };
                
                resolve(obstacle);
            }
        });
    }
    
    // Object pooling functions
    function getInactiveObstacle() {
        if (game.obstacles.inactive.length > 0) {
            return game.obstacles.inactive.pop();
        }
        return null;
    }
    
    function activateObstacle(obstacle) {
        const player = game.player.object;
        if (!player) return;
        
        // Spawn far ahead in Z direction (obstacles come towards stationary player)
        obstacle.position.set(
            player.position.x + (Math.random() - 0.5) * 400, // Random X around player
            player.position.y + (Math.random() - 0.5) * 300, // Random Y around player
            -gameSettings.obstacles.spawnDistance - Math.random() * 500 // Far ahead down Z axis
        );
        
        // Start with base velocity - will be dynamically adjusted based on distance
        obstacle.userData.velocity = gameSettings.obstacles.baseSpeed;
        obstacle.userData.active = true;
        
        // Random rotation
        obstacle.rotation.z = Math.random() * Math.PI * 2;
        
        // Make obstacle face camera
        obstacle.lookAt(camera.position);
        
        // Show obstacle
        obstacle.visible = true;
        
        // Move from inactive to active
        game.obstacles.active.push(obstacle);
    }
    
    function deactivateObstacle(obstacle) {
        obstacle.userData.active = false;
        obstacle.visible = false;
        
        // Remove from active array
        const index = game.obstacles.active.indexOf(obstacle);
        if (index > -1) {
            game.obstacles.active.splice(index, 1);
        }
        
        // Add to inactive pool
        game.obstacles.inactive.push(obstacle);
    }
    
    // Create obstacle pool
    async function createObstaclePool() {
        for (let i = 0; i < gameSettings.obstacles.poolSize; i++) {
            const obstacle = await createObstacleSprite();
            obstacle.visible = false; // Start hidden
            game.obstacles.pool.push(obstacle);
            game.obstacles.inactive.push(obstacle);
            scene.add(obstacle);
        }
    }
    
    // Update obstacles with pooling
    function updateObstacles() {
        // Spawn new obstacles randomly
        if (Math.random() < gameSettings.obstacles.spawnRate && 
            game.obstacles.active.length < gameSettings.obstacles.activeCount) {
            const obstacle = getInactiveObstacle();
            if (obstacle) {
                activateObstacle(obstacle);
            }
        }
        
        // Update active obstacles
        game.obstacles.active.forEach(obstacle => {
            // Calculate distance from obstacle to camera/player
            const distanceToPlayer = Math.abs(obstacle.position.z - camera.position.z);
            
            // Calculate dynamic speed based on distance (closer = faster)
            let speedMultiplier = 1;
            if (distanceToPlayer < gameSettings.obstacles.accelerationDistance) {
                // Inverse relationship: closer objects move faster
                const proximityRatio = 1 - (distanceToPlayer / gameSettings.obstacles.accelerationDistance);
                speedMultiplier = 1 + (proximityRatio * (gameSettings.obstacles.maxSpeed / gameSettings.obstacles.baseSpeed - 1));
            }
            
            // Apply dynamic velocity
            const dynamicVelocity = gameSettings.obstacles.baseSpeed * speedMultiplier;
            obstacle.position.z += dynamicVelocity * (1/60);
            
            // Rotate obstacle faster when closer (more dramatic effect)
            const rotationSpeed = 0.01 * speedMultiplier;
            obstacle.rotation.z += rotationSpeed;
            
            // Make obstacle face camera but use static reference point to avoid landscape movement illusion
            const cameraDirection = new THREE.Vector3(0, 0, 1);
            obstacle.lookAt(obstacle.position.x + cameraDirection.x, obstacle.position.y + cameraDirection.y, obstacle.position.z + cameraDirection.z);
            
            // Deactivate if obstacle passed camera position (since player is at fixed Z)
            if (obstacle.position.z > camera.position.z + gameSettings.obstacles.despawnDistance) {
                deactivateObstacle(obstacle);
            }
        });
    }
    
    // Update special object
    function updateSpecialObject() {
        if (!game.specialObject.active || !game.specialObject.mesh) return;
        
        const specialObj = game.specialObject.mesh;
        const currentTime = Date.now();
        
        // Check if object is paused
        if (game.specialObject.paused) {
            // Check if pause duration has ended
            if (currentTime - game.specialObject.pauseStartTime >= gameSettings.specialObject.pauseDuration) {
                game.specialObject.paused = false;
                game.specialObject.moving = true;
                //console.log('Special object resuming movement');
            }
            return; // Stay paused
        }
        
        // Check if object should stop (reached stop distance)
        const distanceToCamera = Math.abs(specialObj.position.z - camera.position.z);
        if (game.specialObject.moving && distanceToCamera <= gameSettings.specialObject.stopDistance) {
            // Stop and start pause
            game.specialObject.moving = false;
            game.specialObject.paused = true;
            game.specialObject.pauseStartTime = currentTime;
            //console.log('Special object pausing at distance:', distanceToCamera);
            return;
        }
        
        // Move object if it's moving
        if (game.specialObject.moving) {
            specialObj.position.z += gameSettings.specialObject.speed * (1/60);
            
            // Rotate for visual effect
            specialObj.rotation.z += 0.02;
            
            // Make object face camera
            const cameraDirection = new THREE.Vector3(0, 0, 1);
            specialObj.lookAt(specialObj.position.x + cameraDirection.x, specialObj.position.y + cameraDirection.y, specialObj.position.z + cameraDirection.z);
        }
        
        // Remove object if it passed the camera
        if (specialObj.position.z > camera.position.z + gameSettings.obstacles.despawnDistance) {
            scene.remove(specialObj);
            game.specialObject.active = false;
            game.specialObject.mesh = null;
            console.log('Special object despawned');
        }
    }
    
    // Update player
    function updatePlayer() {
        const player = game.player.object;
        if (!player) return;
        
        // Reset velocity first
        const velocity = game.player.velocity;
        velocity.set(0, 0, 0);
        
        // Handle keyboard input
        if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
            velocity.x = -gameSettings.movement.playerSpeed;
        }
        if (game.keys['ArrowRight'] || game.keys['KeyD']) {
            velocity.x = gameSettings.movement.playerSpeed;
        }
        if (game.keys['ArrowUp'] || game.keys['KeyW']) {
            velocity.y = gameSettings.movement.playerSpeed;
        }
        if (game.keys['ArrowDown'] || game.keys['KeyS']) {
            velocity.y = -gameSettings.movement.playerSpeed;
        }
        
        // Handle touch input (swipe/drag)
        if (game.touch.isDragging) {
            const deltaX = game.touch.currentX - game.touch.startX;
            const deltaY = game.touch.currentY - game.touch.startY;
            
            // Convert touch delta to velocity
            velocity.x = deltaX * game.touch.sensitivity * gameSettings.movement.playerSpeed;
            velocity.y = -deltaY * game.touch.sensitivity * gameSettings.movement.playerSpeed; // Invert Y for natural touch feel
        }
        
        // Apply movement to player (only X and Y axes)
        player.position.x += velocity.x * (1/60);
        player.position.y += velocity.y * (1/60);
        
        // Player stays at fixed Z position - obstacles move towards player instead
        
        // Constrain player movement
        const maxOffset = gameSettings.movement.maxPlayerOffset;
        player.position.x = Math.max(-maxOffset, Math.min(maxOffset, player.position.x));
        player.position.y = Math.max(-maxOffset, Math.min(maxOffset, player.position.y));
        
        // Camera follows player in X/Y but stays at fixed Z position
        camera.position.x = player.position.x;
        camera.position.y = player.position.y;
        camera.position.z = 0; // Keep camera at static Z position
        camera.lookAt(player.position.x, player.position.y, -100); // Look ahead down Z axis
    }
    
    // Input handling
    document.addEventListener('keydown', (event) => {
        game.keys[event.code] = true;
        event.preventDefault();
    });
    
    document.addEventListener('keyup', (event) => {
        game.keys[event.code] = false;
        event.preventDefault();
    });
    
    // Touch controls
    function setupTouchControls() {
        const controlButtons = document.querySelectorAll('.control-btn');
        
        controlButtons.forEach(button => {
            const key = button.getAttribute('data-key');
            
            // Handle touch start
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                game.keys[key] = true;
                button.classList.add('active');
            });
            
            // Handle touch end
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                game.keys[key] = false;
                button.classList.remove('active');
            });
            
            // Handle touch cancel
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                game.keys[key] = false;
                button.classList.remove('active');
            });
            
            // Also handle mouse events for desktop testing
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                game.keys[key] = true;
                button.classList.add('active');
            });
            
            button.addEventListener('mouseup', (e) => {
                e.preventDefault();
                game.keys[key] = false;
                button.classList.remove('active');
            });
            
            button.addEventListener('mouseleave', (e) => {
                e.preventDefault();
                game.keys[key] = false;
                button.classList.remove('active');
            });
        });
    }
    
    // Touch swipe controls for mobile
    function setupTouchSwipeControls() {
        const gameContainer = document.getElementById('gameContainer');
        
        // Touch start
        gameContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            game.touch.startX = touch.clientX;
            game.touch.startY = touch.clientY;
            game.touch.currentX = touch.clientX;
            game.touch.currentY = touch.clientY;
            game.touch.isDragging = true;
        }, { passive: false });
        
        // Touch move
        gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!game.touch.isDragging) return;
            
            const touch = e.touches[0];
            game.touch.currentX = touch.clientX;
            game.touch.currentY = touch.clientY;
        }, { passive: false });
        
        // Touch end
        gameContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.touch.isDragging = false;
            game.touch.startX = 0;
            game.touch.startY = 0;
            game.touch.currentX = 0;
            game.touch.currentY = 0;
        }, { passive: false });
        
        // Touch cancel
        gameContainer.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            game.touch.isDragging = false;
            game.touch.startX = 0;
            game.touch.startY = 0;
            game.touch.currentX = 0;
            game.touch.currentY = 0;
        }, { passive: false });
        
        // Also handle mouse events for desktop testing
        gameContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            game.touch.startX = e.clientX;
            game.touch.startY = e.clientY;
            game.touch.currentX = e.clientX;
            game.touch.currentY = e.clientY;
            game.touch.isDragging = true;
        });
        
        gameContainer.addEventListener('mousemove', (e) => {
            e.preventDefault();
            if (!game.touch.isDragging) return;
            
            game.touch.currentX = e.clientX;
            game.touch.currentY = e.clientY;
        });
        
        gameContainer.addEventListener('mouseup', (e) => {
            e.preventDefault();
            game.touch.isDragging = false;
            game.touch.startX = 0;
            game.touch.startY = 0;
            game.touch.currentX = 0;
            game.touch.currentY = 0;
        });
        
        gameContainer.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            game.touch.isDragging = false;
            game.touch.startX = 0;
            game.touch.startY = 0;
            game.touch.currentX = 0;
            game.touch.currentY = 0;
        });
    }
    
    // Handle window resize
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    window.addEventListener('resize', onWindowResize);
    
    // Helper function to update landscape Z position
    window.setLandscapeZ = function(zValue) {
        gameSettings.landscape.zPosition = zValue;
        if (game.landscape) {
            game.landscape.position.z = zValue;
            console.log(`Landscape Z position updated to: ${zValue}`);
        }
    };
    
    // Helper function to get current landscape Z position
    window.getLandscapeZ = function() {
        return gameSettings.landscape.zPosition;
    };
    
    // Debug function for cloud layer visibility
    window.debugCloudLayer = function() {
        if (game.cloudLayer) {
            console.log('Cloud Layer Debug Info:');
            console.log('Position:', game.cloudLayer.position);
            console.log('Visible:', game.cloudLayer.visible);
            console.log('Material opacity:', game.cloudLayer.material.opacity);
            console.log('Texture size:', game.cloudLayer.material.map.image.width + 'x' + game.cloudLayer.material.map.image.height);
            
            // Toggle visibility for testing
            game.cloudLayer.visible = !game.cloudLayer.visible;
            console.log('Toggled visibility to:', game.cloudLayer.visible);
        } else {
            console.log('Cloud layer not found');
        }
    };
    
    // Function to regenerate cloud layer with new parameters
    window.regenerateCloudLayer = function(newThreshold = null, newOpacity = null) {
        if (newThreshold !== null) {
            gameSettings.cloudLayer.threshold = newThreshold;
        }
        if (newOpacity !== null) {
            gameSettings.cloudLayer.opacity = newOpacity;
        }
        
        console.log(`Regenerating cloud layer with threshold: ${gameSettings.cloudLayer.threshold}, opacity: ${gameSettings.cloudLayer.opacity}`);
        
        // Remove existing cloud layer
        if (game.cloudLayer) {
            scene.remove(game.cloudLayer);
            game.cloudLayer.material.map.dispose();
            game.cloudLayer.material.dispose();
            game.cloudLayer.geometry.dispose();
        }
        
        // Create new cloud layer
        createCloudLayer();
    };
    
    // Game loop
    function animate() {
        requestAnimationFrame(animate);
        
        updatePlayer();
        updatePlayerAnimation(); // Update GIF animation
        updateObstacles();
        updateSpecialObject();
        updateWindTrail();
        updateCloudLayer(); // Update cloud layer movement
        
        renderer.render(scene, camera);
    }
    
    // Initialize game
    async function initGame() {
        try {
            createBackground();
            createCloudLayer(); // Create procedural cloud layer
            await createPlayer(); // Now async function
            createSpecialObject(); // Create the special object
            createWindTrail(); // Initialize wind trail system
            await createObstaclePool();
            setupTouchControls(); // Initialize touch button controls
            setupTouchSwipeControls(); // Initialize touch swipe controls
            
            console.log('Game initialized successfully');
            console.log(`Obstacle pool created: ${game.obstacles.pool.length} objects`);
            animate();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'absolute';
            errorDiv.style.top = '50%';
            errorDiv.style.left = '50%';
            errorDiv.style.transform = 'translate(-50%, -50%)';
            errorDiv.style.color = 'red';
            errorDiv.style.fontSize = '24px';
            errorDiv.style.textAlign = 'center';
            errorDiv.innerHTML = 'Failed to load game port_assets!<br>Please add cloud1.png and landscape.png to port_assets/ folder';
            document.body.appendChild(errorDiv);
        }
    }
    
    // Start the game
    initGame();
});