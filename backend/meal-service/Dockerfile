FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app
COPY parent-pom.xml ./pom.xml
RUN mvn install -N -B -q

WORKDIR /app/meal-service
COPY meal-service/pom.xml ./pom.xml
RUN mvn dependency:go-offline -B -q

COPY meal-service/src ./src
RUN mvn package -DskipTests -B -q

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/meal-service/target/*.jar app.jar
RUN mkdir -p logs && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8084
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8084/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java","-XX:+UseContainerSupport","-XX:MaxRAMPercentage=75.0","-Djava.security.egd=file:/dev/./urandom","-jar","app.jar"]
