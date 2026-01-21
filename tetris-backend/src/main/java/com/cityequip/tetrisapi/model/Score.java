package com.cityequip.tetrisapi.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class Score {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private int score; // Puntos? Requirement says "level and lines". Let's store score too if we add
                       // it.
    private int level;
    private int lines;

    private LocalDateTime timestamp = LocalDateTime.now();
}
