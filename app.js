const canvas = document.querySelector("#simCanvas");
const ctx = canvas.getContext("2d");

const statusText = document.querySelector("#statusText");
const taskText = document.querySelector("#taskText");
const motionMeter = document.querySelector("#motionMeter");
const scoreMeter = document.querySelector("#scoreMeter");
const ticketMeter = document.querySelector("#ticketMeter");
const runMeter = document.querySelector("#runMeter");
const levelMeter = document.querySelector("#levelMeter");
const timeMeter = document.querySelector("#timeMeter");
const fareMeter = document.querySelector("#fareMeter");
const ratingMeter = document.querySelector("#ratingMeter");
const missionText = document.querySelector("#missionText");
const feedbackList = document.querySelector("#feedbackList");
const resetButton = document.querySelector("#resetButton");

const world = {
  width: 960,
  height: 680,
  streetWidth: 82,
  sidewalkWidth: 34,
  boxSize: 82,
  stopLineOffset: 54,
  stopZoneLength: 46,
  verticalRoads: [260, 820],
  horizontalRoads: [110, 340, 570],
};

const controls = {
  ArrowUp: { x: 0, y: -1, label: "north" },
  ArrowDown: { x: 0, y: 1, label: "south" },
  ArrowLeft: { x: -1, y: 0, label: "west" },
  ArrowRight: { x: 1, y: 0, label: "east" },
};

const trafficControls = [
  { x: 260, y: 110, type: "light", phaseOffset: 0 },
  { x: 820, y: 110, type: "stop" },
  { x: 260, y: 340, type: "stop" },
  { x: 820, y: 340, type: "light", phaseOffset: 4200 },
  { x: 260, y: 570, type: "stop" },
  { x: 820, y: 570, type: "light", phaseOffset: 7600 },
];

const ride = {
  timeLimit: 60,
  pickupBonus: 15,
  dropoffBonus: 50,
  fare: 18,
};

const routes = [
  {
    pickup: { x: 690, y: 570, label: "Maple Apartments" },
    dropoff: { x: 120, y: 110, label: "Civic Center" },
  },
  {
    pickup: { x: 260, y: 220, label: "North Clinic" },
    dropoff: { x: 820, y: 470, label: "River Market" },
  },
  {
    pickup: { x: 470, y: 340, label: "Library" },
    dropoff: { x: 700, y: 110, label: "School Entrance" },
  },
  {
    pickup: { x: 820, y: 155, label: "Transit Stop" },
    dropoff: { x: 260, y: 510, label: "Community Gym" },
  },
];

const pedestrians = [
  { id: "p1", axis: "vertical", x: 202, period: 19000, offset: 0, direction: 1 },
  { id: "p2", axis: "vertical", x: 878, period: 23000, offset: 2800, direction: -1 },
  { id: "p3", axis: "horizontal", y: 52, period: 20500, offset: 1700, direction: 1 },
  { id: "p4", axis: "horizontal", y: 628, period: 22000, offset: 5200, direction: -1 },
  { id: "p5", axis: "horizontal", y: 282, period: 24000, offset: 7100, direction: 1 },
];

const buildings = [
  { x: 44, y: 182, w: 98, h: 66, height: 20, color: "#7f93a8", roof: "#9fb1c2" },
  { x: 64, y: 410, w: 108, h: 70, height: 20, color: "#8c7f71", roof: "#b29d87" },
  { x: 360, y: 178, w: 118, h: 66, height: 18, color: "#678b7a", roof: "#83aa96" },
  { x: 388, y: 406, w: 118, h: 80, height: 24, color: "#856f9d", roof: "#a793bb" },
  { x: 600, y: 180, w: 110, h: 72, height: 22, color: "#9a855f", roof: "#c2aa7b" },
  { x: 610, y: 404, w: 105, h: 76, height: 22, color: "#6f8796", roof: "#8facbc" },
];

const state = {
  car: { x: 20, y: 570, dir: { x: 1, y: 0 }, targetDir: { x: 1, y: 0 } },
  running: false,
  speed: 112,
  score: 0,
  fare: 0,
  tickets: 0,
  gameOver: false,
  gameOverReason: "",
  level: 0,
  rideStage: "pickup",
  rideTime: ride.timeLimit,
  rideStarted: false,
  rideComplete: false,
  lastTime: 0,
  stoppedAt: new Set(),
  checkedCrossings: new Set(),
  checkedTrafficBoxes: new Set(),
  ticketedTrafficBoxes: new Set(),
  awardedStops: new Set(),
  messages: [],
};

function resetDrive() {
  state.car = { x: 20, y: 570, dir: { x: 1, y: 0 }, targetDir: { x: 1, y: 0 } };
  state.running = false;
  state.score = 0;
  state.fare = 0;
  state.tickets = 0;
  state.gameOver = false;
  state.gameOverReason = "";
  state.level = 0;
  state.rideStage = "pickup";
  state.rideTime = ride.timeLimit;
  state.rideStarted = false;
  state.rideComplete = false;
  state.lastTime = performance.now();
  state.stoppedAt.clear();
  state.checkedCrossings.clear();
  state.checkedTrafficBoxes.clear();
  state.ticketedTrafficBoxes.clear();
  state.awardedStops.clear();
  state.messages = [];
  addFeedback("Level 1: drive over P, then drive over D within 60 seconds.", "good");
  updateText();
}

function addFeedback(message, tone = "good") {
  state.messages.unshift({ message, tone });
  state.messages = state.messages.slice(0, 8);
  feedbackList.innerHTML = "";
  for (const item of state.messages) {
    const li = document.createElement("li");
    li.textContent = item.message;
    li.className = item.tone;
    feedbackList.append(li);
  }
}

function updateText() {
  motionMeter.textContent = state.running ? "Moving" : "Stopped";
  scoreMeter.textContent = String(state.score);
  ticketMeter.textContent = String(state.tickets);
  runMeter.textContent = state.gameOver ? "Restart" : "Active";
  levelMeter.textContent = String(state.level + 1);
  timeMeter.textContent = formatTime(state.rideTime);
  fareMeter.textContent = `$${state.fare}`;
  ratingMeter.textContent = getRating();

  if (state.gameOver) {
    taskText.textContent = "Drive stopped. Press Space to restart, or use Reset Drive.";
    statusText.textContent = state.gameOverReason;
    missionText.textContent = "Ride failed. Press Space to start over from the beginning.";
    return;
  }

  if (state.rideComplete) {
    taskText.textContent = "Ride completed. Press Space or Reset Drive for a new request.";
    statusText.textContent = `Dropoff complete. Final rating: ${getRating()}.`;
    missionText.textContent = "Passenger delivered safely.";
    return;
  }

  const nearStopLine = getActiveStopLine();
  const upcoming = getUpcomingControl(190);
  if (nearStopLine) {
    taskText.textContent = "Stop line ahead. Stop before or at the white line to earn points. Crossing it without stopping ends the drive.";
  } else if (upcoming?.type === "light") {
    const color = getLightColor(upcoming);
    if (color === "green") {
      taskText.textContent = "Traffic light ahead is green. Continue through the traffic box when safe.";
    } else if (color === "yellow") {
      taskText.textContent = "Traffic light ahead is yellow. Stop before the traffic box unless you are already inside it.";
    } else {
      taskText.textContent = "Traffic light ahead is red. Stop before the traffic box.";
    }
  } else {
    taskText.textContent = "Follow the road. Use Arrow Keys to choose a new direction at intersections.";
  }

  statusText.textContent = state.running
    ? "Car is moving at a steady speed. Press Space to stop."
    : "Car is stopped. Press Space to start.";

  const target = getRideTarget();
  const distance = Math.round(getDistance(state.car, target));
  const route = getCurrentRoute();
  missionText.textContent = state.rideStage === "pickup"
    ? `Level ${state.level + 1}: drive over P at ${route.pickup.label}, then drive over D at ${route.dropoff.label}. P is ${distance} ft away.`
    : `Level ${state.level + 1}: rider picked up. Drive over D at ${route.dropoff.label} within 60 seconds. D is ${distance} ft away.`;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getRating() {
  if (state.gameOver) return "1.0";
  const raw = 5 - state.tickets * 0.6 - (state.rideTime < 15 && !state.rideComplete ? 0.2 : 0);
  return Math.max(1, Math.min(5, raw)).toFixed(1);
}

function getRideTarget() {
  const route = getCurrentRoute();
  return state.rideStage === "pickup" ? route.pickup : route.dropoff;
}

function getCurrentRoute() {
  return routes[state.level % routes.length];
}

function getDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getLightColor(control) {
  const cycle = 16000;
  const time = (performance.now() + control.phaseOffset) % cycle;
  if (time < 7600) return "green";
  if (time < 9000) return "yellow";
  return "red";
}

function getNearbyControl(distance) {
  return trafficControls.find((control) => {
    const dx = Math.abs(state.car.x - control.x);
    const dy = Math.abs(state.car.y - control.y);
    return dx <= distance && dy <= distance;
  });
}

function getUpcomingControl(maxDistance) {
  const car = getCarNose(state.car);
  const laneTolerance = 12;
  const candidates = [];

  for (const control of trafficControls) {
    let distance = Infinity;
    if (state.car.dir.x !== 0 && Math.abs(car.y - control.y) <= laneTolerance) {
      const line = control.type === "stop" ? getStopLine(control, state.car.dir).value : getTrafficBoxEntryValue(control, state.car.dir);
      distance = (line - car.x) * state.car.dir.x;
    } else if (state.car.dir.y !== 0 && Math.abs(car.x - control.x) <= laneTolerance) {
      const line = control.type === "stop" ? getStopLine(control, state.car.dir).value : getTrafficBoxEntryValue(control, state.car.dir);
      distance = (line - car.y) * state.car.dir.y;
    }

    if (distance >= 0 && distance <= maxDistance) {
      candidates.push({ ...control, distance });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

function canTurnAtIntersection() {
  return world.verticalRoads.some((x) => Math.abs(state.car.x - x) < 15)
    && world.horizontalRoads.some((y) => Math.abs(state.car.y - y) < 15);
}

function snapToRoads() {
  if (Math.abs(state.car.dir.x) > 0) {
    state.car.y = nearest(world.horizontalRoads, state.car.y);
  } else {
    state.car.x = nearest(world.verticalRoads, state.car.x);
  }
}

function nearest(values, current) {
  return values.reduce((best, value) => Math.abs(value - current) < Math.abs(best - current) ? value : best, values[0]);
}

function toggleMotion() {
  if (state.gameOver || state.rideComplete) {
    resetDrive();
    state.running = true;
    state.rideStarted = true;
    addFeedback("New ride started.", "good");
    updateText();
    return;
  }

  const nearby = getNearbyControl(48);
  const stopLine = getActiveStopLine();
  const lightStopArea = getActiveLightStopArea();
  state.running = !state.running;
  if (state.running) state.rideStarted = true;

  if (!state.running) {
    if (stopLine) {
      state.stoppedAt.add(stopLine.key);
      awardStopPoints(stopLine, 10, "Complete stop at the stop line: +10 points.");
    } else if (lightStopArea && getLightColor(lightStopArea.control) !== "green") {
      state.stoppedAt.add(controlKey(lightStopArea.control));
      awardStopPoints(lightStopArea.control, 8, "Safe stop before the traffic box: +8 points.");
    } else if (nearby?.type === "light" && getLightColor(nearby) !== "green") {
      state.stoppedAt.add(controlKey(nearby));
      awardStopPoints(nearby, 8, "Safe stop before the traffic box: +8 points.");
    }
    checkMissionCheckpoint();
  }

  updateText();
}

function checkMissionCheckpoint() {
  const target = getRideTarget();
  if (getDistance(state.car, target) > 42) return;

  if (state.rideStage === "pickup") {
    state.rideStage = "dropoff";
    state.score += ride.pickupBonus;
    addFeedback(`Level ${state.level + 1} pickup reached: +${ride.pickupBonus} points. Head to D.`, "good");
    return;
  }

  completeLevel();
}

function completeLevel() {
  const completedLevel = state.level + 1;
  state.score += ride.dropoffBonus;
  state.fare += ride.fare;
  state.level += 1;
  state.rideStage = "pickup";
  state.rideTime = ride.timeLimit;
  state.rideStarted = state.running;
  state.stoppedAt.clear();
  state.checkedCrossings.clear();
  state.checkedTrafficBoxes.clear();
  state.ticketedTrafficBoxes.clear();
  state.awardedStops.clear();
  addFeedback(`Level ${completedLevel} complete: +${ride.dropoffBonus} points and $${ride.fare}. New P and D are on the map.`, "good");
}

function controlKey(control) {
  return `${control.x},${control.y}`;
}

function stopLineKey(control, dir) {
  return `${control.x},${control.y}:stop-line:${dir.x},${dir.y}`;
}

function crossingKey(control, dir) {
  return `${control.x},${control.y}:${dir.x},${dir.y}`;
}

function trafficBoxKey(control, dir) {
  return `${control.x},${control.y}:box:${dir.x},${dir.y}`;
}

function getStopLine(control, dir) {
  const offset = world.stopLineOffset;
  if (dir.x > 0) return { control, key: stopLineKey(control, dir), axis: "x", value: control.x - offset, dir, x1: control.x - offset, y1: control.y - 32, x2: control.x - offset, y2: control.y + 32 };
  if (dir.x < 0) return { control, key: stopLineKey(control, dir), axis: "x", value: control.x + offset, dir, x1: control.x + offset, y1: control.y - 32, x2: control.x + offset, y2: control.y + 32 };
  if (dir.y > 0) return { control, key: stopLineKey(control, dir), axis: "y", value: control.y - offset, dir, x1: control.x - 32, y1: control.y - offset, x2: control.x + 32, y2: control.y - offset };
  return { control, key: stopLineKey(control, dir), axis: "y", value: control.y + offset, dir, x1: control.x - 32, y1: control.y + offset, x2: control.x + 32, y2: control.y + offset };
}

function getActiveStopLine() {
  return trafficControls
    .filter((control) => control.type === "stop")
    .map((control) => getStopLine(control, state.car.dir))
    .find((line) => isInStopZone(line));
}

function isInStopZone(line) {
  const car = getCarNose(state.car);
  const laneTolerance = 10;
  if (line.axis === "x") {
    if (Math.abs(car.y - line.control.y) > laneTolerance) return false;
    const distance = (line.value - car.x) * line.dir.x;
    return distance >= 0 && distance <= world.stopZoneLength;
  }
  if (Math.abs(car.x - line.control.x) > laneTolerance) return false;
  const distance = (line.value - car.y) * line.dir.y;
  return distance >= 0 && distance <= world.stopZoneLength;
}

function crossedLine(previous, current, line) {
  const previousNose = getCarNose(previous, line.dir);
  const currentNose = getCarNose(current, line.dir);
  if (line.axis === "x") {
    if (Math.abs(currentNose.y - line.control.y) > 10) return false;
    return line.dir.x > 0
      ? previousNose.x <= line.value && currentNose.x > line.value
      : previousNose.x >= line.value && currentNose.x < line.value;
  }
  if (Math.abs(currentNose.x - line.control.x) > 10) return false;
  return line.dir.y > 0
    ? previousNose.y <= line.value && currentNose.y > line.value
    : previousNose.y >= line.value && currentNose.y < line.value;
}

function getCarNose(car, dir = state.car.dir) {
  const noseOffset = 24;
  return { x: car.x + dir.x * noseOffset, y: car.y + dir.y * noseOffset };
}

function checkStopLineCrossings(previous, current) {
  for (const control of trafficControls) {
    if (control.type !== "stop") continue;
    const line = getStopLine(control, state.car.dir);
    if (!crossedLine(previous, current, line)) continue;
    if (!state.stoppedAt.has(line.key)) {
      endDrive("Stop sign violation. You crossed the white stop line without stopping, so this drive must be restarted.");
      return;
    }
  }
}

function getTrafficBox(control) {
  const half = world.boxSize / 2;
  return { left: control.x - half, right: control.x + half, top: control.y - half, bottom: control.y + half };
}

function getTrafficBoxEntryValue(control, dir) {
  const box = getTrafficBox(control);
  if (dir.x > 0) return box.left;
  if (dir.x < 0) return box.right;
  if (dir.y > 0) return box.top;
  return box.bottom;
}

function getActiveLightStopArea() {
  const car = getCarNose(state.car);
  const laneTolerance = 12;
  for (const control of trafficControls) {
    if (control.type !== "light") continue;
    const entry = getTrafficBoxEntryValue(control, state.car.dir);
    if (state.car.dir.x !== 0) {
      if (Math.abs(car.y - control.y) > laneTolerance) continue;
      const distance = (entry - car.x) * state.car.dir.x;
      if (distance >= 0 && distance <= world.stopZoneLength) return { control, distance };
    } else {
      if (Math.abs(car.x - control.x) > laneTolerance) continue;
      const distance = (entry - car.y) * state.car.dir.y;
      if (distance >= 0 && distance <= world.stopZoneLength) return { control, distance };
    }
  }
  return null;
}

function isPointInsideBox(point, box) {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function enteredTrafficBox(previous, current, control) {
  const box = getTrafficBox(control);
  const previousNose = getCarNose(previous, state.car.dir);
  const currentNose = getCarNose(current, state.car.dir);
  return !isPointInsideBox(previousNose, box) && isPointInsideBox(currentNose, box);
}

function checkTrafficBoxEntries(previous, current) {
  for (const control of trafficControls) {
    if (control.type !== "light") continue;
    const box = getTrafficBox(control);
    const key = trafficBoxKey(control, state.car.dir);
    const color = getLightColor(control);

    if (isPointInsideBox(getCarNose(current), box) && color !== "green" && !state.ticketedTrafficBoxes.has(key)) {
      state.ticketedTrafficBoxes.add(key);
      issueTicket(`Traffic box violation. You were inside the box on ${color}.`);
      continue;
    }

    if (!enteredTrafficBox(previous, current, control)) continue;
    if (state.checkedTrafficBoxes.has(key)) continue;
    state.checkedTrafficBoxes.add(key);
    if (color === "green") awardCrossingPoints(key, 5, "Entered the traffic box on green: +5 points.");
  }
}

function awardStopPoints(control, points, message) {
  const key = control.key || controlKey(control);
  if (state.awardedStops.has(key)) return;
  state.awardedStops.add(key);
  state.score += points;
  addFeedback(message, "good");
}

function awardCrossingPoints(key, points, message) {
  state.score += points;
  addFeedback(message, "good");
}

function issueTicket(message) {
  state.tickets += 1;
  state.score = Math.max(0, state.score - 15);
  addFeedback(`${message} -15 points.`, "bad");
  if (state.tickets >= 2) {
    endDrive("Shift failed. Two tickets is the limit for this ride.");
    return;
  }
  updateText();
}

function endDrive(message) {
  state.running = false;
  state.gameOver = true;
  state.gameOverReason = message;
  addFeedback(`${message} Press Space to restart.`, "bad");
  updateText();
}

function updateRideTimer(deltaSeconds) {
  if (!state.rideStarted || state.gameOver || state.rideComplete) return;
  state.rideTime = Math.max(0, state.rideTime - deltaSeconds);
  if (state.rideTime === 0) endDrive("Ride request expired. The passenger did not reach the dropoff in time.");
}

function updateCar(deltaSeconds) {
  if (!state.running || state.gameOver) return;
  if (canTurnAtIntersection()) {
    state.car.dir = { ...state.car.targetDir };
    snapToRoads();
  }

  const previous = { x: state.car.x, y: state.car.y };
  state.car.x += state.car.dir.x * state.speed * deltaSeconds;
  state.car.y += state.car.dir.y * state.speed * deltaSeconds;

  wrapCar();
  checkStopLineCrossings(previous, state.car);
  if (state.gameOver) return;
  checkTrafficBoxEntries(previous, state.car);
  checkPedestrianCollision();
  if (state.gameOver) return;
  checkMissionCheckpoint();
}

function getPedestrianPosition(pedestrian, time = performance.now()) {
  const cycle = ((time + pedestrian.offset) % pedestrian.period) / pedestrian.period;
  const margin = 34;
  const directionProgress = pedestrian.direction > 0 ? cycle : 1 - cycle;
  if (pedestrian.axis === "horizontal") return { x: -margin + directionProgress * (world.width + margin * 2), y: pedestrian.y };
  return { x: pedestrian.x, y: -margin + directionProgress * (world.height + margin * 2) };
}

function checkPedestrianCollision() {
  for (const pedestrian of pedestrians) {
    const position = getPedestrianPosition(pedestrian);
    if (getDistance(state.car, position) < 28 || getDistance(getCarNose(state.car), position) < 28) {
      endDrive("Pedestrian safety incident. The car hit someone on the sidewalk.");
      return;
    }
  }
}

function wrapCar() {
  const margin = 42;
  if (state.car.x < -margin) state.car.x = world.width + margin;
  if (state.car.x > world.width + margin) state.car.x = -margin;
  if (state.car.y < -margin) state.car.y = world.height + margin;
  if (state.car.y > world.height + margin) state.car.y = -margin;
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawGrass();
  drawRoads();
  drawBuildings();
  drawTrafficControls();
  drawRideMarkers();
  drawPedestrians();
  drawCar();
  if (state.gameOver) drawGameOver();
}

function drawGrass() {
  const grassGradient = ctx.createLinearGradient(0, 0, world.width, world.height);
  grassGradient.addColorStop(0, "#8fbe78");
  grassGradient.addColorStop(0.52, "#79aa6c");
  grassGradient.addColorStop(1, "#5f8f5c");
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
  for (let x = 0; x < world.width; x += 96) {
    for (let y = 0; y < world.height; y += 82) {
      ctx.beginPath();
      ctx.ellipse(x + 26, y + 26, 20, 8, -0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRoads() {
  ctx.lineCap = "butt";
  for (const x of world.verticalRoads) drawRoadSegment(x, 0, x, world.height);
  for (const y of world.horizontalRoads) drawRoadSegment(0, y, world.width, y);

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 18]);
  for (const x of world.verticalRoads) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (const y of world.horizontalRoads) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  drawCrosswalks();
  drawTrafficBoxes();
}

function drawRoadSegment(x1, y1, x2, y2) {
  ctx.strokeStyle = "rgba(35, 44, 48, 0.22)";
  ctx.lineWidth = world.streetWidth + world.sidewalkWidth + 12;
  ctx.beginPath();
  ctx.moveTo(x1 + 8, y1 + 10);
  ctx.lineTo(x2 + 8, y2 + 10);
  ctx.stroke();
  ctx.strokeStyle = "#d8d1c1";
  ctx.lineWidth = world.streetWidth + world.sidewalkWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = "#5b646b";
  ctx.lineWidth = world.streetWidth;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawBuildings() {
  for (const building of buildings) drawBuilding(building);
}

function drawBuilding(building) {
  const depth = building.height;
  const { x, y, w, h } = building;
  ctx.save();
  ctx.fillStyle = "rgba(30, 38, 42, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + depth * 0.55, y + h / 2 + depth * 0.45, w * 0.64, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darken(building.color, 0.22);
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + depth, y + depth);
  ctx.lineTo(x + w + depth, y + h + depth);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = darken(building.color, 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w + depth, y + h + depth);
  ctx.lineTo(x + depth, y + h + depth);
  ctx.closePath();
  ctx.fill();
  const roofGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  roofGradient.addColorStop(0, building.roof);
  roofGradient.addColorStop(1, darken(building.roof, 0.12));
  ctx.fillStyle = roofGradient;
  roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(x + 8, y + 8, w - 16, h - 16, 3);
  ctx.stroke();
  ctx.restore();
}

function darken(hex, amount) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  const scale = 1 - amount;
  return `rgb(${Math.round(red * scale)}, ${Math.round(green * scale)}, ${Math.round(blue * scale)})`;
}

function drawCrosswalks() {
  for (const x of world.verticalRoads) {
    for (const y of world.horizontalRoads) drawCrosswalkSet(x, y);
  }
}

function drawCrosswalkSet(x, y) {
  const half = world.boxSize / 2;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  for (let i = -28; i <= 28; i += 14) {
    ctx.fillRect(x + i - 4, y - half - 17, 8, 32);
    ctx.fillRect(x + i - 4, y + half - 15, 8, 32);
    ctx.fillRect(x - half - 17, y + i - 4, 32, 8);
    ctx.fillRect(x + half - 15, y + i - 4, 32, 8);
  }
  ctx.restore();
}

function drawTrafficControls() {
  for (const control of trafficControls) {
    if (control.type === "stop") {
      drawStopLines(control);
      drawStopSign(control.x, control.y);
    } else {
      drawTrafficLight(control.x, control.y, getLightColor(control));
    }
  }
}

function drawTrafficBoxes() {
  for (const x of world.verticalRoads) {
    for (const y of world.horizontalRoads) {
      const box = getTrafficBox({ x, y });
      ctx.save();
      ctx.fillStyle = "rgba(246, 211, 107, 0.12)";
      ctx.strokeStyle = "rgba(246, 211, 107, 0.92)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.fillRect(box.left, box.top, world.boxSize, world.boxSize);
      ctx.strokeRect(box.left, box.top, world.boxSize, world.boxSize);
      ctx.restore();
    }
  }
}

function drawRideMarkers() {
  const route = getCurrentRoute();
  drawTargetMarker(route.pickup, "P", state.rideStage === "pickup" ? "#1f73b7" : "#8794a0");
  drawTargetMarker(route.dropoff, "D", state.rideStage === "dropoff" ? "#197b4b" : "#8794a0");
}

function drawTargetMarker(target, label, color) {
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.fillStyle = "rgba(21, 31, 38, 0.24)";
  ctx.beginPath();
  ctx.ellipse(8, 11, 38, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 29, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 25px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawPedestrians() {
  for (const pedestrian of pedestrians) drawPedestrian(getPedestrianPosition(pedestrian));
}

function drawPedestrian(position) {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.fillStyle = "rgba(22, 30, 34, 0.22)";
  ctx.beginPath();
  ctx.ellipse(4, 23, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6c56f";
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#24323a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, 12);
  ctx.moveTo(-9, 3);
  ctx.lineTo(9, 7);
  ctx.moveTo(0, 12);
  ctx.lineTo(-8, 23);
  ctx.moveTo(0, 12);
  ctx.lineTo(8, 23);
  ctx.stroke();
  ctx.restore();
}

function drawStopLines(control) {
  const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.setLineDash([]);
  for (const dir of directions) {
    const line = getStopLine(control, dir);
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStopSign(x, y) {
  ctx.save();
  ctx.translate(x + 37, y - 37);
  ctx.strokeStyle = "#5c656b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, 49);
  ctx.stroke();
  ctx.fillStyle = "#b3261e";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  polygon(0, 0, 18, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 8px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STOP", 0, 0);
  ctx.restore();
}

function polygon(x, y, radius, sides) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = Math.PI / sides + i * Math.PI * 2 / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawTrafficLight(x, y, color) {
  ctx.save();
  ctx.translate(x + 35, y - 42);
  ctx.strokeStyle = "#47535b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(0, 76);
  ctx.stroke();
  ctx.fillStyle = "#20262a";
  ctx.strokeStyle = "#f4f6f7";
  ctx.lineWidth = 2;
  roundRect(-12, -34, 24, 68, 6);
  ctx.fill();
  ctx.stroke();
  drawSignalBulb(0, -21, color === "red" ? "#dc2f2f" : "#5a2424");
  drawSignalBulb(0, 0, color === "yellow" ? "#f2c94c" : "#5a5124");
  drawSignalBulb(0, 21, color === "green" ? "#16a163" : "#244833");
  ctx.restore();
}

function drawSignalBulb(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawCar() {
  ctx.save();
  ctx.translate(state.car.x, state.car.y);
  const angle = Math.atan2(state.car.dir.y, state.car.dir.x);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(15, 24, 29, 0.28)";
  ctx.beginPath();
  ctx.ellipse(4, 13, 34, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f314a";
  roundRect(-26, -16, 52, 32, 7);
  ctx.fill();
  const carGradient = ctx.createLinearGradient(-20, -14, 22, 14);
  carGradient.addColorStop(0, "#2a91d1");
  carGradient.addColorStop(0.55, "#1f73b7");
  carGradient.addColorStop(1, "#15517f");
  ctx.fillStyle = carGradient;
  roundRect(-20, -12, 40, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#d9eefc";
  roundRect(0, -8, 14, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#ffe16b";
  ctx.fillRect(21, -7, 5, 4);
  ctx.fillRect(21, 3, 5, 4);
  ctx.fillStyle = "#111";
  roundRect(-18, -20, 11, 6, 2);
  ctx.fill();
  roundRect(-18, 14, 11, 6, 2);
  ctx.fill();
  roundRect(9, -20, 11, 6, 2);
  ctx.fill();
  roundRect(9, 14, 11, 6, 2);
  ctx.fill();
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(23, 32, 38, 0.72)";
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Arial";
  ctx.fillText("Restart Required", world.width / 2, world.height / 2 - 42);
  ctx.font = "22px Arial";
  drawCenteredWrappedText(state.gameOverReason, world.width / 2, world.height / 2 + 4, 720, 28);
  ctx.font = "18px Arial";
  ctx.fillText("Press Space to restart, or use the Reset Drive button.", world.width / 2, world.height / 2 + 76);
  ctx.restore();
}

function drawCenteredWrappedText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  lines.forEach((currentLine, index) => ctx.fillText(currentLine, x, y + index * lineHeight));
}

function loop(timestamp) {
  const deltaSeconds = Math.min(0.05, (timestamp - state.lastTime) / 1000 || 0);
  state.lastTime = timestamp;
  updateRideTimer(deltaSeconds);
  updateCar(deltaSeconds);
  draw();
  updateText();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    toggleMotion();
    return;
  }

  const next = controls[event.key];
  if (next) {
    event.preventDefault();
    if (state.gameOver) return;
    state.car.targetDir = { x: next.x, y: next.y };
    addFeedback(`Direction set to ${next.label}. The car will turn at the next intersection.`, "good");
  }
});

resetButton.addEventListener("click", resetDrive);
resetDrive();
requestAnimationFrame(loop);
