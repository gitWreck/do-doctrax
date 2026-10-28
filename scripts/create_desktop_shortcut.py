import os
import subprocess

desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
target_vbs = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'launch.vbs')
working_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shortcut_file = os.path.join(desktop, 'DO-DocTrax.lnk')

vbs_builder = f'''
Set ws = CreateObject("WScript.Shell")
Set sc = ws.CreateShortcut("{shortcut_file}")
sc.TargetPath = "wscript.exe"
sc.Arguments = """{target_vbs}"""
sc.WorkingDirectory = "{working_dir}"
sc.Description = "CFNR DO-DocTrax Document Tracking System"
sc.IconLocation = "shell32.dll,277"
sc.Save
'''

temp_script = os.path.join(os.environ.get('TEMP', working_dir), 'make_lnk.vbs')
with open(temp_script, 'w', encoding='utf-8') as f:
    f.write(vbs_builder)

subprocess.run(['cscript', '//nologo', temp_script], check=True)
if os.path.exists(temp_script):
    os.remove(temp_script)

print(f"SUCCESS: Desktop shortcut created at: {shortcut_file}")
