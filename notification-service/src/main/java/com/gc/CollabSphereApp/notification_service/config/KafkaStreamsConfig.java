package com.gc.CollabSphereApp.notification_service.config;

import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.KStream;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafkaStreams;

import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.kstream.Consumed;
import org.springframework.kafka.support.serializer.JsonSerde;


import org.springframework.kafka.config.KafkaStreamsConfiguration;
import org.springframework.beans.factory.annotation.Value;
import java.util.HashMap;
import java.util.Map;
import com.gc.CollabSphereApp.event.PostLikedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@EnableKafkaStreams
public class KafkaStreamsConfig {
    private static final Logger log = LoggerFactory.getLogger(KafkaStreamsConfig.class);

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean(name = "defaultKafkaStreamsConfig")  // Changed bean name
    public KafkaStreamsConfiguration defaultKafkaStreamsConfig() {  // Changed method name
        Map<String, Object> props = new HashMap<>();
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, "notification-service-streams");
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.Long().getClass().getName());
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, JsonSerde.class.getName());

        // Add these additional configurations
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.AT_LEAST_ONCE);
        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, "1000");

        return new KafkaStreamsConfiguration(props);
    }

    @Bean
    public KStream<Long, PostLikedEvent> postLikedStream(StreamsBuilder builder) {
        JsonSerde<PostLikedEvent> jsonSerde = new JsonSerde<>(PostLikedEvent.class);

        KStream<Long, PostLikedEvent> stream = builder.stream("post-liked-topic",
                Consumed.with(Serdes.Long(), jsonSerde));

        stream.foreach((key, event) -> {
            Long postCreatorId = event.getUserid();
            Long likedByUserId = event.getLikedByUserId();
            Long postId = event.getPostid();
            log.info("[KafkaStreams] User {} liked post {} (creator: {}). Notification sent to User {}.",
                    likedByUserId, postId, postCreatorId);
        });

        return stream;
    }
}