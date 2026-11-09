# Picked threads with comments — 2026-11-09 20:42 UTC

## https://www.reddit.com/r/homelab/comments/1xri34y/whats_the_best_way_to_fit_33060_full_size_cards/
- comments: 24
  - Bagelsarenakeddonuts: You just gotta push really hard until they fit. Jokes aside, risers.
  - timmeh87: does full size mean 3 slots wide? they make 2 slot wide 3070's ( i have one) isnt there some kind of narrow cooler you can fit? But also the "stuff" on a pci card is on the left side for this angle, so there is room to p
  - knifesk: If the X8 PCIe are open ended you could fit them as in the marked slots as long as they are 2u tall. If they're 2.5 or 3, forget about it. If the PCIe sockets are not open ended you'll have to use raisers or make them Op
  - Computers_and_cats: Good chance you are stuck with risers and a power supply upgrade. Odds are those x8 slots aren't capable of providing the slot power the GPUs need after you cut the back open. Also even though your 3060 might not have a 
  - Chameleon_The: I have an deep cool 850w PSU
  - Computers_and_cats: Probably fine in that case. Odd it only has two 6+2-pin connectors. I don't think I would recommend using PCIe power splitters to run your 3060 if you plan on running 3.
  - Chameleon_The: Yeah thinking of buying one more cable but I am.little.scared
  - Computers_and_cats: Just make sure you get it from a reputable source and test it with non critical hardware first.
  - neovb: You need to go look at the block diagram thats in the motherboard manual. That'll tell you the exact specifications of how many PCIe lanes each slot supports. From what I gather, although you have physical x16 slots, the
  - Inevitable-Self-2702: Risers, or shuck 'em and do water blocks instead. People have done the latter for R9700s to fit like 8 of those puppies in this space (they're 2 slot cards). Edit: alternatively a mobo with more PCIe slots going to an EP
  - timmeh87: 8 is impressive given theres 7 slots
  - Inevitable-Self-2702: I assume they used bifurcation risers like one guy used for a dual R9700 NR200P build
  - Chameleon_The: I live in 3rd world country those are old not widely available And even this one I got is by luck
  - Chameleon_The: Thanks for the advice will look into thia
  - IntelligentLake: That board's page is here and in the manual it shows that only 4 slots are really x8 (slots 4-7), so if they are 2 slot cards, use 4 and 6, if they are three slot cards, use 4 and 7. If it's for AI, that only requires x1

## https://www.reddit.com/r/homelab/comments/1xs0s0u/two_proliants_and_two_gpu_towers_on_basement_wire/
- comments: 7
  - that1guyrob: Is that a Windows login I see? Fail.
  - jonah_omninode: It is not. It’s Ubuntu desktop.
  - that1guyrob: Oh thank goodness! I was about to say 'What a waste of a perfectly good server!" LOL I don't know why that looked so Window-sy to me.
  - jonah_omninode: The last Windows machine I had was strictly for gaming, but that was in 2014, lol.
  - that1guyrob: This is the way
  - NC1HM: This... is... HORRIBLE!!! Wire racks are very bad for cats. At least cover the wires with some cardboard...
  - jonah_omninode: Yeah, I need to work on my cable management. I have no cats.

## https://www.reddit.com/r/sysadmin/comments/1xrps0p/temperature_sensor_placement/
- comments: 19
  - nekenaharry: The temperature that matters for the equipment is the air going into the servers, so the cold aisle at rack intake is the usual place for alarm thresholds. ASHRAE recommends an intake range of roughly 18 to 27 C. A commo
  - Forsaken-Carrot9038: This person keeps their cool!
  - GelatinousSalsa: What do you want to measure?
  - Snoo_61639: I mean it was placed on the hot aisle, so is there a significance on placing it there? Is there a best practice temperature for hot aisle in datacenter?
  - SanFranPanManStand: If you were the only person managing the entire data center environmental systems, wouldn't you want to know both? You'd want to see the ambient air temperature BEFORE the air is pulled through the racks, because that's 
  - Kamwind: Where the rack intake is and at various heights. That way you can tell what the temperature is that reaching the servers. Putting at the hot you can then calculate the heat difference. Personally never had enough probe t
  - Forsaken-Carrot9038: Same, our server room only had three temperature sensors. One in the middle of the room column, second in the rooms inflowing air stream, and one on the rooms exit air stream
  - SafeAdventurous1065: if the datacenter has some In row Coolers with snmp i start by monitoring the information in that device.
  - pdp10: If you're monitoring the internal temperatures of almost every piece of equipment, and you're monitoring the CRACs, do you even need discrete temperature sensors? The answer may be that you don't, but the humidity sensor
  - Snoo_61639: We only have i think 2 server racks, the rest are either synology, network switches, patch panels
  - mediweevil: IMO you put them at the bottom of the rack in the cold aisle. their purpose is to sample ambient temp, not post equipment load. the latter is something that is either done by the equipment itself, or secondarily if you n
  - Reo_Strong: Ideally, each rack would have three in front and three in back (top, middle, bottom). I don't live in an ideal world, so we have 2 sets of 2. One set of two is at top between two racks, where fresh air is pumped into the
  - vivkkrishnan2005: My answer is a bit convoluted, so please bear on this The correct sensors and their placement depends on how much information can be gotten out of each sensor AND what analytics can be done AND most importantly, what is 
  - Snoo_61639: Our hot aisle are on the sides Our cold aisle is on the middle Should I close all the perforated tiles on the hot aisle and put all the perforated tiles in the cold aisle?
  - VA_Network_Nerd: I encourage you to sign up for, and ingest some free training on how to manage a data center / server room environment. This is one free and popular example, but others certainly exist: https://www.se.com/au/en/work/serv

## https://www.reddit.com/r/homelab/comments/1xrubgo/any_way_to_cool_down_my_cards/
- comments: 12
  - Wally-Gator-1: Moving to an ATX case with multiple 12 cm fans or an open case ?
  - Logical-Pirate1795: It already an ATX case, 3 14cm fans in, and the city i live in is very humid, so i cant consider the opencase
  - Wally-Gator-1: You have 660W of GPU power + your PSU (likely another 100W) to move in a humid environment. You would need to meet 150-200 CFM minimum. So, roughly 3X14 intake and 3x14 outake minimum. Can you increase the fan speed to m
  - Logical-Pirate1795: I have 3X14 intake, i will try to speed up it to maximum. As for the 3x14 outake, i have 1x14 outake at the moment. can the 4 blower on the cards take the remining jobs?
  - Logical-Pirate1795: After doing some research on AI and chinese related video, it should be already on default 100% fan speed :(.
  - Wally-Gator-1: No the blowers on the card only takes heat away from the GPU dice, but this heat then needs to be exhausted out of the case. The airflow is fresh in, heat out of component removed, hot out in a different direction. Intak
  - stuffwhy: How high are the fan speeds set
  - Logical-Pirate1795: H12D-8D have a very poor ipmi tools and BMC, extremly lack of docs, unable to check. but it should not at low speed as some fans on it is very lound which on other computer is quite.
  - stuffwhy: Get it as much clearance between the system and the wall there as you can. The USB fan is probably nearly worthless. You probably need better fans. Or to change the whole case if that doesn't help.
  - eseld_rosevear: Another fan on the wall helps if it pulls air out of the 4m² room and the front intake is not sucking that air back in. You already have three 140mm fans pulling in and one 140mm fan pushing out, and the cards are limite
  - Logical-Pirate1795: Which temperature i could provide? For room temperature, it around 27oC near by the intake (idle) at nigh, for day time, it should around 33oc
  - NC1HM: Put the cards in a refrigerator, next to beer: https://preview.redd.it/g2qqyusbum0i1.png?width=480&format=png&auto=webp&s=bd8caa9ff39ff3737f00b6f3e8dcef6b9aaaa096

