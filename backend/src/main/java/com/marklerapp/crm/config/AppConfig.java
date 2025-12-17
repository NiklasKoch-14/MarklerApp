package com.marklerapp.crm.config;

import org.springframework.boot.info.BuildProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.util.Properties;

/**
 * Application configuration for general beans and utilities.
 *
 * <p>This configuration class provides application-wide beans that don't
 * fit into more specific configuration classes.</p>
 */
@Configuration
public class AppConfig {

    /**
     * Build properties bean for application version and build information.
     *
     * <p>This bean provides build-time information such as version, build time,
     * and artifact details. If build-info.properties is not generated during
     * the build process, this provides fallback values.</p>
     *
     * <p>To generate build-info.properties automatically, ensure the
     * spring-boot-maven-plugin is configured with build-info goal in pom.xml:</p>
     *
     * <pre>
     * {@code
     * <plugin>
     *     <groupId>org.springframework.boot</groupId>
     *     <artifactId>spring-boot-maven-plugin</artifactId>
     *     <executions>
     *         <execution>
     *             <goals>
     *                 <goal>build-info</goal>
     *             </goals>
     *         </execution>
     *     </executions>
     * </plugin>
     * }
     * </pre>
     *
     * @return BuildProperties bean with application build information
     */
    @Bean
    public BuildProperties buildProperties() {
        Properties properties = new Properties();

        // Set default values (will be overridden if build-info.properties exists)
        properties.put("group", "com.marklerapp");
        properties.put("artifact", "realestate-crm");
        properties.put("name", "Real Estate CRM Backend");
        properties.put("version", "1.0.0-SNAPSHOT");
        properties.put("time", Instant.now().toString());

        return new BuildProperties(properties);
    }
}
