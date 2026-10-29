Option Explicit

Dim WshShell, fso, strDir, objWMIService, colProcesses, objProc
Dim isRunning

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Check if DO-DocTrax server.py is already running specifically for this directory
isRunning = False
On Error Resume Next
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
If Err.Number = 0 Then
    ' Filter for Python processes (python.exe, python3.12.exe, etc.) running server.py
    Set colProcesses = objWMIService.ExecQuery( _
        "Select ProcessId, CommandLine from Win32_Process " & _
        "Where Name Like 'python%' And CommandLine Like '%server.py%'")
        
    If Not colProcesses Is Nothing Then
        For Each objProc In colProcesses
            If Not IsNull(objProc.CommandLine) Then
                ' Match this specific project directory to avoid false positives with other projects
                If InStr(1, objProc.CommandLine, strDir, vbTextCompare) > 0 Then
                    isRunning = True
                    Exit For
                End If
            End If
        Next
    End If
End If
On Error GoTo 0

' 2. Start server.py invisibly if not already active
If Not isRunning Then
    WshShell.CurrentDirectory = strDir
    
    On Error Resume Next
    WshShell.Run "python """ & strDir & "\server.py""", 0, False
    If Err.Number <> 0 Then
        MsgBox "Failed to start DO-DocTrax." & vbCrLf & vbCrLf & _
               "Could not locate 'python' in your system PATH." & vbCrLf & _
               "Please ensure Python 3 is installed and added to PATH.", _
               vbCritical, "DO-DocTrax Launcher Error"
        WScript.Quit 1
    End If
    On Error GoTo 0

    ' Allow Python sufficient time (1.5 seconds) to initialize imports, load SQLite, and bind port 8000
    WScript.Sleep 1500
End If

' 3. Open default web browser to the DO-DocTrax dashboard
WshShell.Run "http://localhost:8000"
