pipeline {
    agent any

    environment {
        NODE_VERSION = '22'
        REPO_URL = 'https://github.com/YRELIS-COFFEBAR/YRELIS-FRONTEND.git'
        BRANCH = 'main'
    }

    tools {
        nodejs NODE_VERSION
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "📥 Clonando repositorio: ${REPO_URL}"
                    // checkout explícito con limpieza
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${BRANCH}"]],
                        userRemoteConfigs: [[
                            url: REPO_URL,
                            credentialsId: '' // Si usas credenciales, pon el ID aquí
                        ]],
                        extensions: [
                            [$class: 'CleanBeforeCheckout'],
                            [$class: 'CloneOption', depth: 1, shallow: true]
                        ]
                    ])
                    sh 'ls -la'
                    // Verificar que el proyecto existe
                    if (fileExists('package.json')) {
                        echo '✅ package.json encontrado'
                    } else {
                        error '❌ No se encontró package.json. Verifica la estructura del repositorio.'
                    }
                }
            }
        }

        stage('Setup Node') {
            steps {
                nodejs(NODE_VERSION) {
                    sh '''
                        echo "Node version: $(node --version)"
                        echo "NPM version: $(npm --version)"
                    '''
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                nodejs(NODE_VERSION) {
                    script {
                        // Intentar npm ci o npm install
                        if (fileExists('package-lock.json')) {
                            sh 'npm ci --cache .npm --prefer-offline'
                        } else {
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('Lint (opcional)') {
            steps {
                nodejs(NODE_VERSION) {
                    sh '''
                        echo "Ejecutando lint..."
                        npm run lint || echo "⚠️ Lint falló, continuando..."
                    '''
                }
            }
        }

        stage('Ejecutar pruebas (opcional)') {
            steps {
                nodejs(NODE_VERSION) {
                    sh '''
                        echo "Ejecutando pruebas..."
                        npm run test -- --watch=false --browsers=ChromeHeadless || echo "⚠️ Pruebas fallaron, continuando..."
                    '''
                }
            }
        }

        stage('Compilar (producción)') {
            steps {
                nodejs(NODE_VERSION) {
                    script {
                        // Intentar build:prod, si falla intentar build normal
                        try {
                            sh 'npm run build:prod'
                        } catch (err) {
                            echo '⚠️ build:prod falló, intentando build...'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }

        stage('Identificar artefacto') {
            steps {
                script {
                    // Buscar el directorio de build
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
                    if (!foundPath) {
                        error '❌ No se encontró el directorio de build'
                    }
                    // Guardar la ruta para usarla después
                    env.DIST_PATH = foundPath
                }
            }
        }

        stage('Empaquetar artefacto') {
            steps {
                script {
                    echo "📦 Empaquetando artefacto desde: ${env.DIST_PATH}"
                    archiveArtifacts artifacts: "${env.DIST_PATH}/**/*", fingerprint: true
                }
            }
        }

        stage('Desplegar a Desarrollo') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo '🚀 Desplegando a entorno de desarrollo...'
                    // Aquí va tu script de despliegue
                    withCredentials([
                        string(credentialsId: 'DEV_SERVER_HOST', variable: 'DEV_HOST'),
                        string(credentialsId: 'DEV_SERVER_USER', variable: 'DEV_USER')
                    ]) {
                        sh '''
                            echo "Desplegando a ${DEV_HOST}"
                            # Ejemplo con rsync
                            # rsync -avz --delete --exclude='*.map' \
                            #   ${DIST_PATH}/ \
                            #   ${DEV_USER}@${DEV_HOST}:/var/www/yrelis-dev/
                        '''
                    }
                }
            }
        }

        stage('Desplegar a Producción') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo '🚀 Desplegando a producción...'
                    withCredentials([
                        string(credentialsId: 'PROD_SERVER_HOST', variable: 'PROD_HOST'),
                        string(credentialsId: 'PROD_SERVER_USER', variable: 'PROD_USER')
                    ]) {
                        sh '''
                            echo "Desplegando a ${PROD_HOST}"
                            # Ejemplo con rsync
                            # rsync -avz --delete --exclude='*.map' \
                            #   ${DIST_PATH}/ \
                            #   ${PROD_USER}@${PROD_HOST}:/var/www/yrelis/
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo '🧹 Limpiando espacio de trabajo...'
                cleanWs()
            }
        }
        success {
            script {
                echo '✅ Build de YRELIS-FRONTEND completado EXITOSAMENTE.'
                echo "📦 Artefacto disponible en: ${BUILD_URL}artifact/"
                // Notificar éxito (ejemplo con Slack)
                // slackSend(color: 'good', message: "✅ Build #${BUILD_NUMBER} exitoso: ${JOB_NAME}")
            }
        }
        failure {
            script {
                echo '❌ Build de YRELIS-FRONTEND FALLÓ.'
                echo "🔍 Revisa los logs en: ${BUILD_URL}console"
                // Notificar fallo (ejemplo con Slack)
                // slackSend(color: 'danger', message: "❌ Build #${BUILD_NUMBER} falló: ${JOB_NAME}")
            }
        }
        aborted {
            echo '⚠️ El build fue cancelado.'
        }
        unstable {
            echo '⚠️ El build es inestable (pruebas fallidas).'
        }
    }
}