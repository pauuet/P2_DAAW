package com.cityequip.tetrisapi.repository;

import com.cityequip.tetrisapi.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScoreRepository extends JpaRepository<Score, Long> {
    // All scores ordered by lines desc, then level desc
    List<Score> findAllByOrderByLinesDescLevelDesc();
}
