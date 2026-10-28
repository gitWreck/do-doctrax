Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if server.py is already running
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where CommandLine Like '%server.py%'")

If colProcesses.Count = 0 Then
    ' Start server.py completely invisibly (0 = hidden window)
    WshShell.CurrentDirectory = strDir
    WshShell.Run "python """ & strDir & "\server.py""", 0, False
    WScript.Sleep 600
End If

' Open default web browser to the DO-DocTrax dashboard
WshShell.Run "http://localhost:8000"
