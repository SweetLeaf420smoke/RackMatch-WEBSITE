# Picked threads with comments — 2026-11-09 20:55 UTC

## https://www.reddit.com/r/homelab/comments/1xri34y/whats_the_best_way_to_fit_33060_full_size_cards/
- comments: 37
  - Bagelsarenakeddonuts: You just gotta push really hard until they fit. Jokes aside, risers.
  - Chameleon_The: 😓😓🙁😒
  - Chameleon_The: I heard there are adaptersboss but I am confused what to pick raisers vsadapters
  - timmeh87: does full size mean 3 slots wide? they make 2 slot wide 3070's ( i have one) isnt there some kind of narrow cooler you can fit? But also the "stuff" on a pci card is on the left side for this angle, so there is room to p
  - Chameleon_The: I have 2 cards that are 3 fans ones that are full size And one card 2 fans
  - timmeh87: im talking in pci slot widths not number of fans
  - Chameleon_The: All are full sized bro
  - frenzykiwi: So three slots wide? Because that's what your being asked. In which case your third card will hang over the bottom/side/edge of the main board. You could always post the model number then we can all see exactly what we a
  - Chameleon_The: Yes boss 3 slots wide
  - frenzykiwi: Can see the slots aren't open so it's either cut the back carefully or use risers. At least with risers you can get a bigger gap between them and use 2 of the x16 slots. But I'm not sure about a x8 to x16 riser for the t
  - knifesk: If the X8 PCIe are open ended you could fit them as in the marked slots as long as they are 2u tall. If they're 2.5 or 3, forget about it. If the PCIe sockets are not open ended you'll have to use raisers or make them Op
  - Computers_and_cats: Good chance you are stuck with risers and a power supply upgrade. Odds are those x8 slots aren't capable of providing the slot power the GPUs need after you cut the back open. Also even though your 3060 might not have a 
  - Chameleon_The: I have an deep cool 850w PSU
  - Computers_and_cats: Probably fine in that case. Odd it only has two 6+2-pin connectors. I don't think I would recommend using PCIe power splitters to run your 3060 if you plan on running 3.
  - Chameleon_The: Yeah thinking of buying one more cable but I am.little.scared
  - MINE: No_Engineering_2443: If the deepcool is modular, only buy the pcie cable made for that exact psu model. modular cables aren't standard on the psu side - pinouts differ between brands and even between models, and a wrong one can fry the gpu i

## https://www.reddit.com/r/homelab/comments/1xs0s0u/two_proliants_and_two_gpu_towers_on_basement_wire/
- comments: 8
  - that1guyrob: Is that a Windows login I see? Fail.
  - jonah_omninode: It is not. It’s Ubuntu desktop.
  - that1guyrob: Oh thank goodness! I was about to say 'What a waste of a perfectly good server!" LOL I don't know why that looked so Window-sy to me.
  - jonah_omninode: The last Windows machine I had was strictly for gaming, but that was in 2014, lol.
  - that1guyrob: This is the way
  - NC1HM: This... is... HORRIBLE!!! Wire racks are very bad for cats. At least cover the wires with some cardboard...
  - jonah_omninode: Yeah, I need to work on my cable management. I have no cats.
  - No_Engineering_2443: Nice setup. one thing i'd check is what circuit all that sits on - 5090 + 4090 in one tower can spike past 1kw on its own, add the second tower and the proliants and a single 15a basement circuit gets tight fast. a cheap
  - MINE: No_Engineering_2443: Nice setup. one thing i'd check is what circuit all that sits on - 5090 + 4090 in one tower can spike past 1kw on its own, add the second tower and the proliants and a single 15a basement circuit gets tight fast. a cheap

## https://www.reddit.com/r/sysadmin/comments/1xrps0p/temperature_sensor_placement/
- comments: 20
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
  - No_Engineering_2443: yes, perforated tiles belong in the cold aisle only. tiles in the hot aisle just dump cold air where nothing breathes it and mix it with exhaust, so your cooling works harder for nothing. also put blanking panels in empt
  - MINE: No_Engineering_2443: yes, perforated tiles belong in the cold aisle only. tiles in the hot aisle just dump cold air where nothing breathes it and mix it with exhaust, so your cooling works harder for nothing. also put blanking panels in empt

