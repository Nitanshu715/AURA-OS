import os
import sys
import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from memory_daemon import MemoryDaemon
from system_bridge import SystemBridge

import api.fs as fs_api

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
    "gemini-pro-latest"
]
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")

class AIEngine:
    def __init__(self, memory: MemoryDaemon, bridge: SystemBridge):
        self.memory = memory
        self.bridge = bridge
        self.api_key = GEMINI_API_KEY

    def _query_gemini(self, system_instruction: str, contents: List[Dict[str, Any]]) -> Optional[str]:
        if not self.api_key:
            return None

        # Sanitize contents for strictly alternating turns
        clean_contents = []
        last_role = None
        for c in contents:
            role = c.get("role", "user")
            parts = c.get("parts", [])
            if not parts or not parts[0].get("text"):
                continue
            if role == last_role:
                clean_contents[-1]["parts"][0]["text"] += "\n" + parts[0]["text"]
            else:
                clean_contents.append({"role": role, "parts": [{"text": parts[0]["text"]}]})
                last_role = role

        if clean_contents and clean_contents[0]["role"] == "model":
            clean_contents.pop(0)

        if not clean_contents:
            clean_contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": clean_contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048
            }
        }
        data = json.dumps(payload).encode("utf-8")

        for model_name in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=12) as response:
                    res_data = json.loads(response.read().decode("utf-8"))
                    candidates = res_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
            except Exception:
                continue
        return None

    def _query_ollama(self, prompt: str, system_prompt: str) -> Optional[str]:
        url = f"{OLLAMA_HOST}/api/generate"
        payload = {
            "model": "llama3.2:1b",
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1024
            }
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data.get("response", "").strip()
        except Exception:
            return None

    def process_instruction(self, user_input: str) -> Dict[str, Any]:
        # Retrieve recent history before saving current turn
        recent_history = self.memory.get_recent_messages(limit=8)
        self.memory.save_message("user", user_input)
        telemetry = self.bridge.get_telemetry()
        weather = self.bridge.get_weather()

        lower_input = user_input.strip().lower()

        # Handle explicit shell prefix
        if lower_input.startswith("$ ") or lower_input.startswith("run ") or lower_input.startswith("exec "):
            raw_cmd = user_input.split(" ", 1)[1]
            exec_res = self.bridge.execute_command(raw_cmd)
            self.memory.log_command(raw_cmd, exec_res["stdout"] or exec_res["stderr"], exec_res["exit_code"])
            reply = (
                f"[COMMAND EXECUTED] $ {raw_cmd} (Exit: {exec_res['exit_code']}, Time: {exec_res['duration_ms']}ms)\n"
                f"{exec_res['stdout'] if exec_res['stdout'] else exec_res['stderr']}"
            )
            self.memory.save_message("assistant", reply)
            return {"reply": reply, "action": "command_exec", "result": exec_res}

        # Handle Direct Memory Storing
        if lower_input.startswith("remember "):
            parts = user_input[9:].split(" is ", 1) if " is " in user_input[9:] else user_input[9:].split(":", 1)
            if len(parts) == 2:
                k, v = parts[0].strip(), parts[1].strip()
                self.memory.remember("user", k, v)
                reply = f"I have saved that to my neural memory: '{k}' = '{v}'."
            else:
                self.memory.remember("note", "general", user_input[9:].strip())
                reply = f"I have recorded note: '{user_input[9:].strip()}' in my memory."
            self.memory.save_message("assistant", reply)
            return {"reply": reply, "action": "memory_stored"}

        # System telemetry facts to feed LLM
        sys_context = (
            f"REAL SYSTEM TELEMETRY (100% REAL DATA, DO NOT INVENT NUMBERS):\n"
            f"- OS: {telemetry['os_name']} ({telemetry['cpu_arch']})\n"
            f"- RAM Usage: {telemetry['memory']['used_mb']} MB used out of {telemetry['memory']['total_mb']} MB ({telemetry['memory']['percent']}% load, {telemetry['memory']['free_mb']} MB free)\n"
            f"- Disk Usage: {telemetry['disk']['used_gb']} GB used / {telemetry['disk']['total_gb']} GB total ({telemetry['disk']['free_gb']} GB free)\n"
            f"- Live Weather / Location: {weather.get('raw', 'Unavailable')}\n"
            f"- Available Compilers: C++ (g++), Java (javac/java), Python 3.13 (python)\n"
            f"- User Home: ~ (Desktop: ~/Desktop, Documents: ~/Documents, Downloads: ~/Downloads)\n"
        )

        system_instruction = (
            "You are AURA-OS AI Assistant, an intelligent, helpful, natural, and highly capable desktop AI companion.\n"
            "STRICT RULES:\n"
            "1. Talk naturally and clearly. When asked about RAM, CPU, disk, location, or weather, answer with exact accuracy using the provided REAL SYSTEM TELEMETRY.\n"
            "2. If the user asks you to create, write, or configure a code file (e.g. C++ hello.cpp, Java Main.java, Python script), or confirms ('yes make it', 'do it', 'create it'), generate the complete code and format it inside a tool directive:\n"
            "   :::CREATE_FILE path=\"~/Documents/hello.cpp\":::\n"
            "   <exact code here>\n"
            "   :::END_CREATE_FILE:::\n"
            "4. If the user asks you to compile/run a C++ or Java or Python file, add the tool directive:\n"
            "   :::RUN_CODE lang=\"cpp\" path=\"~/Documents/hello.cpp\":::\n"
            "5. Always remember conversation context. If the user refers to previous instructions ('make it', 'what did I say', 'compile it'), follow through based on the chat history.\n"
            "6. Be concise, polite, and professional."
        )

        # Build multi-turn contents list
        contents = []
        for msg in recent_history:
            role = "user" if msg["role"] == "user" else "model"
            txt = msg["content"]
            # Skip if duplicate or empty
            if txt:
                contents.append({
                    "role": role,
                    "parts": [{"text": txt}]
                })

        current_prompt = f"{sys_context}\n\nUser Question/Instruction:\n{user_input}"
        contents.append({
            "role": "user",
            "parts": [{"text": current_prompt}]
        })

        # 1. Query Gemini Flash
        response_text = self._query_gemini(system_instruction, contents)

        # 2. Fallback to Ollama if Gemini is unavailable
        if not response_text:
            response_text = self._query_ollama(current_prompt, system_instruction)

        # 3. If neither LLM responds, provide accurate programmatic answers with deterministic file creation
        if not response_text:
            if "ram" in lower_input or "memory" in lower_input:
                response_text = f"Current RAM usage: {telemetry['memory']['used_mb']} MB used out of {telemetry['memory']['total_mb']} MB ({telemetry['memory']['percent']}% load)."
            elif "temp" in lower_input or "weather" in lower_input or "location" in lower_input:
                response_text = f"Live Weather & Location: {weather.get('raw', 'Unable to reach weather provider.')}"
            elif any(k in lower_input for k in ["create", "generate", "make", "touch", "write"]) and any(ext in lower_input for ext in [".cpp", ".java", ".py", ".c", ".txt", ".js", ".html", "file"]):
                filename_match = re.search(r'([a-zA-Z0-9_\-]+\.(?:cpp|java|py|c|txt|js|html|json|md))', user_input, re.IGNORECASE)
                fn = filename_match.group(1) if filename_match else "hello.cpp"
                folder = "~/Documents" if "document" in lower_input else ("~/Desktop" if "desktop" in lower_input else "~/Documents")
                target_f = f"{folder}/{fn}"
                
                sample_code = ""
                if fn.endswith('.cpp'):
                    sample_code = '#include <iostream>\n\nint main() {\n    std::cout << "Hello from AURA-OS!" << std::endl;\n    return 0;\n}\n'
                elif fn.endswith('.java'):
                    cls_name = fn.replace('.java', '')
                    sample_code = f'public class {cls_name} {{\n    public static void main(String[] args) {{\n        System.out.println("Hello from AURA-OS!");\n    }}\n}}\n'
                elif fn.endswith('.py'):
                    sample_code = 'print("Hello from AURA-OS!")\n'
                else:
                    sample_code = f'// {fn} created by AURA AI\n'

                response_text = (
                    f":::CREATE_FILE path=\"{target_f}\":::\n"
                    f"{sample_code}"
                    f":::END_CREATE_FILE:::\n\n"
                    f"Created `{fn}` in `{folder}` successfully. You can open it in Editor or compile it via Terminal."
                )
            else:
                response_text = f"AURA AI Assistant is online. System status: RAM at {telemetry['memory']['percent']}%, Storage at {telemetry['disk']['percent']}%. Let me know what you would like me to do."

        # Parse and execute any generated tool actions
        created_files = []
        create_pattern = re.compile(r':::CREATE_FILE path="([^"]+)"(?::*:*)?\s*(.*?)\s*:::END_CREATE_FILE(?::*:*)?', re.DOTALL)
        for match in create_pattern.finditer(response_text):
            target_path = match.group(1)
            file_code = match.group(2)
            
            # Save into AURA-OS virtual filesystem (storage_home)
            try:
                resolved_p = fs_api.resolve_safe_path(target_path)
                os.makedirs(os.path.dirname(resolved_p), exist_ok=True)
                with open(resolved_p, "w", encoding="utf-8") as f:
                    f.write(file_code)
                created_files.append(target_path)
            except Exception as e:
                response_text += f"\n[Error saving {target_path}: {str(e)}]"

            # Also mirror to Windows Host profile if running on Windows
            if sys.platform.startswith('win'):
                try:
                    host_p = os.path.abspath(os.path.expanduser(target_path.replace("~", os.environ.get("USERPROFILE", os.path.expanduser("~")))))
                    os.makedirs(os.path.dirname(host_p), exist_ok=True)
                    with open(host_p, "w", encoding="utf-8") as f:
                        f.write(file_code)
                except Exception:
                    pass

        # Remove the file creation markers from visible clean text
        def format_create_block(m):
            code = m.group(2).strip()
            if code:
                return f"\n```{m.group(1).split('.')[-1]}\n{code}\n```\n"
            return ""

        cleaned_reply = create_pattern.sub(format_create_block, response_text).strip()

        # Parse any run directive
        run_pattern = re.compile(r':::RUN_CODE lang="([^"]+)" path="([^"]+)"(?::*:*)?')
        run_match = run_pattern.search(cleaned_reply)
        if run_match:
            run_lang = run_match.group(1)
            run_path = run_match.group(2)
            resolved_run_p = fs_api.resolve_safe_path(run_path)
            exec_res = self.bridge.compile_and_run(run_lang, resolved_run_p)
            cleaned_reply = run_pattern.sub('', cleaned_reply).strip()
            if exec_res.get("status") == "success":
                out_txt = exec_res.get('stdout', '').strip()
                cleaned_reply += f"\n\n[EXECUTION OUTPUT]\n{out_txt}"
                if exec_res.get("stderr"):
                    cleaned_reply += f"\n[STDERR]: {exec_res.get('stderr').strip()}"
            else:
                cleaned_reply += f"\n\n[EXECUTION FAILED ({exec_res.get('status')})]\n{exec_res.get('stderr') or exec_res.get('error')}"

        if created_files:
            cleaned_reply += f"\n\n[File created on {', '.join(created_files)}]"

        cleaned_reply = cleaned_reply.strip()

        self.memory.save_message("assistant", cleaned_reply)
        return {
            "reply": cleaned_reply,
            "action": "chat_reply",
            "created_files": created_files
        }

if __name__ == "__main__":
    mem = MemoryDaemon()
    bridge = SystemBridge()
    ai = AIEngine(mem, bridge)
    print("Test RAM query:", ai.process_instruction("What is my exact RAM usage right now?"))
    print("Test Weather query:", ai.process_instruction("What is the temperature at my location?"))