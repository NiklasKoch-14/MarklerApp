FROM eclipse-temurin:17-jdk-alpine as build

WORKDIR /app

# Copy Maven files
COPY pom.xml .
COPY src ./src

# Install Maven
RUN apk update && apk add --no-cache maven

# Build the application
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Install wget for health check
RUN apk add --no-cache wget

# Create app user
RUN addgroup -S app && adduser -S app -G app

# Create directories for uploads
RUN mkdir -p /app/uploads /app/data && chown -R app:app /app

# Copy JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Change ownership to app user
RUN chown app:app app.jar

USER app

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8085/actuator/health || exit 1

CMD ["java", "-jar", "app.jar"]