local function getOrUpdate(file)
    if fs.exists(file..".lua") then fs.delete(file..".lua") end
    shell.run("wget https://raw.githubusercontent.com/Diebeck/CCTweaked-Network/refs/heads/main/device/"..file..".lua")
end
local function askForFile(file)
    if fs.exists(file..".lua") then
        fs.delete(file..".lua")
        shell.run("wget https://raw.githubusercontent.com/Diebeck/CCTweaked-Network/refs/heads/main/device/"..file..".lua")
    else
        print("Install '"..file..".lua'? (y/n)")
        if string.lower(read()) == "y" then
            shell.run("wget https://raw.githubusercontent.com/Diebeck/CCTweaked-Network/refs/heads/main/device/"..file..".lua")
        end
    end
end

getOrUpdate("startup")
getOrUpdate("chat")
if turtle then getOrUpdate("startup") end
askForFile("server")
askForFile("gps")

os.reboot()