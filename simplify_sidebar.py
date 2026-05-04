with open('app/dashboard/page.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "onClick={() => setActiveTab('funding')}" in line:
        skip = True
        new_lines.pop() # remove previous <button
    elif "onClick={() => setActiveTab('snapshots')}" in line:
        skip = True
        new_lines.pop()
    elif "onClick={() => setActiveTab('inference')}" in line:
        skip = True
        new_lines.pop()
    elif "onClick={() => setActiveTab('manifest')}" in line:
        skip = True
        new_lines.pop()
    elif "onClick={() => setActiveTab('vault')}" in line:
        skip = True
        new_lines.pop()
    elif "onClick={() => setActiveTab('a2a')}" in line:
        skip = True
        new_lines.pop()
        
    if skip and "</button>" in line:
        skip = False
        continue
        
    if not skip:
        # Rename Memory Studio to 0G Memory Explorer
        if "Memory Studio" in line and "<Database size" in line:
            line = line.replace("Memory Studio", "0G Memory Explorer")
        # Rename RAG Chat to Autonomous RAG
        if "RAG Chat" in line and "<Brain size" in line:
            line = line.replace("RAG Chat", "Autonomous RAG")
            
        new_lines.append(line)

with open('app/dashboard/page.tsx', 'w') as f:
    f.writelines(new_lines)
