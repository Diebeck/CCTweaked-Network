local modems = {
    -- CHANGE THESE VALUES
    -- Coordinates must be from the block the modem is ATTACHED to
    -- modem_N = {X, Y, Z}
    modem_4 = {117, 64, -493},
    modem_6 = {111, 64, -487},
    top = {110, 64, -493},
    modem_5 = {111, 70, -493}
}

for index, value in pairs(modems) do
    if value[3] < 0 then modems[index][3] = value[3]-1 end -- Accounts for negative integer coordinates
    local m = peripheral.wrap(index)
    m.open(gps.CHANNEL_GPS)
end

-- Serve requests indefinitely
while true do
    local e, p1, p2, p3, p4, p5 = os.pullEvent("modem_message")
    if e == "modem_message" then
        -- We received a message from a modem
        local sSide, sChannel, sReplyChannel, sMessage, nDistance = p1, p2, p3, p4, p5
        if sChannel == gps.CHANNEL_GPS and sMessage == "PING" and nDistance then
            -- We received a ping message on the GPS channel, send a response
            local modem = peripheral.wrap(sSide)
            modem.transmit(sReplyChannel, gps.CHANNEL_GPS, modems[sSide])
        end
    end
end