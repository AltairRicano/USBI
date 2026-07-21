import os

files = [
    ('frontend/src/features/games/WordSearchGame.tsx', 'WordSearchState', 'WordSearchEngine'),
    ('frontend/src/features/games/CrosswordGame.tsx', 'CrosswordState', 'CrosswordEngine'),
    ('frontend/src/features/games/PuzzleGame.tsx', 'PuzzleState', 'PuzzleEngine')
]

for filepath, state_type, engine_type in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Move useMemo before useState
    # Find useState
    state_str = f"const [state, setState] = useState<{state_type} | null>(null);"
    engine_str_start = f"const engine = useMemo("

    lines = content.split('\n')
    new_lines = []

    engine_line = ""
    for line in lines:
        if line.lstrip().startswith(engine_str_start):
            engine_line = line
            break

    skip_engine = False
    for line in lines:
        if line.strip() == state_str:
            new_lines.append(engine_line)
            new_lines.append(f"  const [state, setState] = useState<{state_type}>(() => engine.getState());")
        elif line.lstrip().startswith(engine_str_start):
            skip_engine = True
        elif line.strip() == "setState({ ...engine.getState() });":
            pass # remove this line
        elif line.strip() == "if (!state) return <div>Loading...</div>;":
            pass # remove this line
        else:
            if skip_engine:
                skip_engine = False
                continue # we skipped the engine line, which is usually a single line
            new_lines.append(line)

    with open(filepath, 'w') as f:
        f.write('\n'.join(new_lines))
