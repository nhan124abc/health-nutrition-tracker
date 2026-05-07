# Build stage
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copy maven executable and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Give execution permission to mvnw
RUN chmod +x mvnw

# Resolve dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline

# Copy source code and build
COPY src src
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Render uses the PORT environment variable
ENV SERVER_PORT=8080
EXPOSE 8080

# Run the application
# We use the PORT env var provided by Render if available
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
