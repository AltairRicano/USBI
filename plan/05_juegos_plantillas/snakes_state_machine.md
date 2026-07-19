# Máquina de Estados: Serpientes y Escaleras con IA

Este documento describe la máquina de estados del motor de Serpientes y Escaleras con Inteligencia Artificial.

```mermaid
stateDiagram-v2
    [*] --> idle

    idle --> player_turn : start()
    
    player_turn --> player_rolling : rollPlayer()
    player_rolling --> player_moving : (Motor calcula roll y avance)
    
    player_moving --> resolving_player_tile : (Animación intermedia de Phaser completada)
    resolving_player_tile --> ai_turn : (Cálculo de casilla regular, serpiente o escalera) / no gana
    resolving_player_tile --> game_over : gana player
    
    ai_turn --> ai_thinking : (Turno iniciado)
    ai_thinking --> ai_rolling : (Cálculo probabilístico Weighted Random)
    ai_rolling --> ai_moving : (Motor calcula roll y avance de IA)
    
    ai_moving --> resolving_ai_tile : (Animación intermedia completada)
    resolving_ai_tile --> player_turn : (Cálculo de casilla) / no gana
    resolving_ai_tile --> game_over : gana IA
    
    game_over --> [*]
```

### Relación entre Motor y Animación
- **Motor:** Calcula toda la decisión y el estado futuro instantáneamente al invocar el método de tirar el dado o turno de IA. Realiza validación de `Weighted Random` para decidir el riesgo de la IA de forma aislada y pura.
- **Animación (Phaser):** Recibe el estado inicial y el destino, y anima secuencialmente el movimiento recorriendo las casillas intermedias (derivadas del roll). Al finalizar el recorrido a la casilla intermedia, si hay una serpiente o escalera, realiza una interpolación adicional (jump) al destino final. Al terminar, el motor permite al siguiente turno iniciar.
