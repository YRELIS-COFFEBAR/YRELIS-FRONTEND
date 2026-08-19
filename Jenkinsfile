pipeline {
  agent any

  environment {
    PROJECT_DIR = 'yrelis-coffeebar-frontend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup Node') {
      steps {
        // Usa el nombre exacto: node-22
        nodejs('node-22') {
          sh '''
            node --version
            npm --version
          '''
        }
      }
    }

    stage('Instalar dependencias') {
      steps {
        nodejs('node-22') {
          dir(PROJECT_DIR) {
            sh 'npm ci || npm install'
          }
        }
      }
    }

    stage('Compilar (producción)') {
      steps {
        nodejs('node-22') {
          dir(PROJECT_DIR) {
            sh 'npm run build:prod'
          }
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        dir(PROJECT_DIR) {
          sh 'ls -la dist/'
          archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
        }
      }
    }
  }

  post {
    success {
      echo '✅ Build de Yrelis CoffeeBar completado correctamente.'
    }
    failure {
      echo '❌ El build de Yrelis CoffeeBar falló.'
    }
  }
}