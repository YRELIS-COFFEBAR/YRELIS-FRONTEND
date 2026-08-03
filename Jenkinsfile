pipeline {
  agent any

  environment {
    NODE_VERSION = '22'
    PROJECT_DIR  = 'yrelis-coffeebar-frontend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup Node') {
      steps {
        nodejs(version: NODE_VERSION) {
          sh '''
            node --version
            npm --version
          '''
        }
      }
    }

    stage('Instalar dependencias') {
      steps {
        nodejs(version: NODE_VERSION) {
          dir(PROJECT_DIR) {
            sh 'npm ci || npm install'
          }
        }
      }
    }

    stage('Compilar (producción)') {
      steps {
        nodejs(version: NODE_VERSION) {
          dir(PROJECT_DIR) {
            sh 'npm run build:prod'
          }
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        dir("${PROJECT_DIR}/dist") {
          archiveArtifacts artifacts: 'yrelis-coffeebar-frontend/**/*', fingerprint: true
        }
      }
    }

    stage('Desplegar (opcional)') {
      when {
        branch 'main'
      }
      steps {
        echo 'Configura aquí tu despliegue (SSH, Docker, Nginx, S3...)'
        // Ejemplo con rsync:
        // sh "rsync -avz --delete ${PROJECT_DIR}/dist/yrelis-coffeebar-frontend/ usuario@servidor:/var/www/yrelis/"
      }
    }
  }

  post {
    success {
      echo 'Build de Yrelis CoffeeBar completado correctamente.'
    }
    failure {
      echo 'El build de Yrelis CoffeeBar falló.'
    }
  }
}
