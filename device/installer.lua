-- Installs required programs and updates present ones

-- Installs or updates
local function getOrUpdate(file)
    if fs.exists(file) then fs.delete(file) end
    shell.run("wget https://raw.githubusercontent.com/Diebeck/CCTweaked-Network/refs/heads/main/device/"..file)
end

-- Only updates if file exists
local function update(file)
    if fs.exists(file) then
        fs.delete(file)
        shell.run("wget https://raw.githubusercontent.com/Diebeck/CCTweaked-Network/refs/heads/main/device/"..file)
    end
end

getOrUpdate("startup.lua")
getOrUpdate("chat.lua")
if turtle then getOrUpdate("turtle.lua") end
update("server.lua")
update("gps.lua")

os.reboot()