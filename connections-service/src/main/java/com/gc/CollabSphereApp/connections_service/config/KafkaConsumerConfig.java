package com.gc.CollabSphereApp.connections_service.config;

import com.gc.CollabSphereApp.event.UserCreatedEvent;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {

    // Your existing error-handler bean
    @Bean
    public DefaultErrorHandler userCreatedEventErrorHandler(
            KafkaTemplate<String, UserCreatedEvent> dlqKafkaTemplate,
            @Value("${kafka.topic.user-created-dlq}") String dlqTopic) {

        DeadLetterPublishingRecoverer recoverer =
                new DeadLetterPublishingRecoverer(dlqKafkaTemplate,
                        (record, ex) -> new TopicPartition(dlqTopic, record.partition()));

        return new DefaultErrorHandler(recoverer, new FixedBackOff(0L, 1));
    }

    // New: register the above DefaultErrorHandler on the listener container
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, UserCreatedEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, UserCreatedEvent> consumerFactory,
            DefaultErrorHandler userCreatedEventErrorHandler) {

        ConcurrentKafkaListenerContainerFactory<String, UserCreatedEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(userCreatedEventErrorHandler);
        return factory;
    }
}