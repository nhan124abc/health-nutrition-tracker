FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app
COPY parent-pom.xml ./pom.xml
RUN mvn install -N -B -q

WORKDIR /app/auth-service
COPY auth-service/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B -q

COPY auth-service/src ./src
RUN mvn package -DskipTests -B -q

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/auth-service/target/*.jar app.jar
RUN mkdir -p logs uploads/avatars && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:8081/actuator/health || exit 1
ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75.0","-Djava.security.egd=file:/dev/./urandom","-jar","app.jar"]
