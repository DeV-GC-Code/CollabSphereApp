package com.gc.CollabSphereApp.posts_service.config;

import com.gc.CollabSphereApp.event.PostCreatedEvent;
import com.gc.CollabSphereApp.posts_service.entity.Post;
import org.modelmapper.ModelMapper;
import org.modelmapper.PropertyMap;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();

        // Map Post.userId -> PostCreatedEvent.userid
        modelMapper.addMappings(new PropertyMap<Post, PostCreatedEvent>() {
            @Override
            protected void configure() {
                map().setUserid(source.getUserId());
            }
        });

        return modelMapper;
    }
}