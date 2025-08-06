package com.gc.CollabSphereApp.user_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaTopicConfig {
    @Bean
    public NewTopic userCreatedTopic() {
        return new NewTopic("user-created-topic", 3,(short)1);
    }
}