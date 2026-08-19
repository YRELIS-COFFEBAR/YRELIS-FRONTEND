pipeline {
  agent any

  environment {
    NODE_TOOL = 'node-22'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: 'develop']],
          userRemoteConfigs: [[
            url: 'https://github.com/YRELIS-COFFEBAR/YRELIS-FRONTEND.git',
            credentialsId: 'Ardamins'
          ]]
        ])
      }
    }

    stage('Setup Node') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat '''
            node --version
            npm --version
          '''
        }
      }
    }

    stage('Instalar dependencias') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat 'npm ci || npm install'
        }
      }
    }

    stage('Compilar (producción)') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat 'npm run build:prod'
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        bat 'dir dist'
        archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
      }
    }

    stage('Desplegar (opcional)') {
      when {
        branch 'main'
      }
      steps {
        echo 'Configura aquí tu despliegue (SSH, Docker, Nginx, S3...)'
        // Ejemplo con xcopy en Windows:
        // bat 'xcopy /E /I dist\\* C:\\www\\yrelis\\'
      }
    }
  }

  post {
    success {
      echo ' Build de Yrelis CoffeeBar completado correctamente.'
    }
    failure {
      echo ' El build de Yrelis CoffeeBar falló.'
    }
  }
}