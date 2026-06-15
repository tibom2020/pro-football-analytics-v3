
import json
from collections import Counter

with open(r'c:\Users\phanv\Downloads\copilotkit-events-1778427752118.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    agent_ids = [item.get('agentId') for item in data]
    counts = Counter(agent_ids)
    print(counts)
