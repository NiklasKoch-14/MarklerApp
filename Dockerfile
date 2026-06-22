FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY backend/pom.xml .
COPY backend/src ./src
RUN apk update && apk add --no-cache maven
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget
RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/uploads /app/logs && chown -R app:app /app
COPY --from=build /app/target/*.jar app.jar
RUN chown app:app app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=90s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8085}/api/v1/actuator/health || exit 1
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
