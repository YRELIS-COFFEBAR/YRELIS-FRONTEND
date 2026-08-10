pipeline {
    agent any

    environment {
        // Usar el nombre exacto de tu instalación de Node.js en Jenkins
        NODEJS_HOME = tool name: 'NodeJS-22', type: 'nodejs'
        REPO_URL = 'https://github.com/YRELIS-COFFEBAR/YRELIS-FRONTEND.git'
        BRANCH = 'develop'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "📥 Clonando repositorio: ${REPO_URL}"
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${BRANCH}"]],
                        userRemoteConfigs: [[
                            url: REPO_URL,
                            credentialsId: 'Ardamins'
                        ]],
                        extensions: [
                            [$class: 'CleanBeforeCheckout'],
                            [$class: 'CloneOption', depth: 1, shallow: true]
                        ]
                    ])
                    sh 'ls -la'
                }
            }
        }

        stage('Setup Node.js') {
            steps {
                script {
                    // Usar Node.js desde la herramienta configurada
                    def nodeHome = tool name: 'NodeJS-22', type: 'nodejs'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    sh '''
                        echo "Node version: $(node --version)"
                        echo "NPM version: $(npm --version)"
                    '''
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                script {
                    def nodeHome = tool name: 'NodeJS-22', type: 'nodejs'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    sh '''
                        echo "📦 Instalando dependencias..."
                        if [ -f package-lock.json ]; then
                            npm ci --cache .npm --prefer-offline
                        else
                            npm install
                        fi
                    '''
                }
            }
        }

        stage('Compilar') {
            steps {
                script {
                    def nodeHome = tool name: 'NodeJS-22', type: 'nodejs'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                    sh '''
                        echo "🔨 Compilando proyecto..."
                        # Intentar diferentes scripts de build
                        if npm run | grep -q "build:prod"; then
                            npm run build:prod
                        elif npm run | grep -q "build"; then
                            npm run build
                        else
                            echo "⚠️ No se encontró script de build"
                            npm run build || ng build
                        fi
                    '''
                }
            }
        }

        stage('Empaquetar artefacto') {
            steps {
                script {
                    echo "📦 Buscando artefactos..."
                    // Buscar diferentes rutas de distribución
                    def distPaths = [
                        'dist/yrelis-coffeebar-frontend',
                        'dist',
                        'build'
                    ]
                    def foundPath = null
                    for (path in distPaths) {
                        if (fileExists(path)) {
                            foundPath = path
                            echo "✅ Artefacto encontrado en: ${foundPath}"
                            break
                        }
                    }
                    if (foundPath) {
                        archiveArtifacts artifacts: "${foundPath}/**/*", fingerprint: true
                    } else {
                        echo "⚠️ No se encontraron artefactos, creando archivo de log..."
                        sh 'echo "No se encontraron artefactos" > build.log'
                        archiveArtifacts artifacts: 'build.log', fingerprint: true
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo '🧹 Limpiando espacio de trabajo...'
                // Usar cleanWs con try-catch para evitar errores
                try {
                    cleanWs()
                } catch (err) {
                    echo "⚠️ Error limpiando workspace: ${err.message}"
                }
            }
        }
        success {
            echo '✅ Build de YRELIS-FRONTEND completado EXITOSAMENTE.'
            echo "📦 Artefacto disponible en: ${BUILD_URL}artifact/"
        }
        failure {
            echo '❌ Build de YRELIS-FRONTEND FALLÓ.'
            echo "🔍 Revisa los logs en: ${BUILD_URL}console"
        }
        aborted {
            echo '⚠️ El build fue cancelado.'
        }
    }
}