extends Node3D

const PLAYER_SCRIPT = preload("res://scripts/player_controller.gd")
const DUMMY_SCRIPT = preload("res://scripts/training_dummy.gd")
const HUD_SCRIPT = preload("res://scripts/game_hud.gd")

func _ready() -> void:
	_build_environment()
	_build_city()
	var player = CharacterBody3D.new()
	player.name = "Hero"
	player.set_script(PLAYER_SCRIPT)
	add_child(player)
	player.global_position = Vector3(0, 1.2, 8)
	for point in [Vector3(-5, 0.0, -9), Vector3(0, 0.0, -13), Vector3(5, 0.0, -9)]:
		var dummy = StaticBody3D.new()
		dummy.name = "TrainingTarget"
		dummy.set_script(DUMMY_SCRIPT)
		add_child(dummy)
		dummy.global_position = point
	var hud = CanvasLayer.new()
	hud.name = "HUD"
	hud.set_script(HUD_SCRIPT)
	add_child(hud)

func _build_environment() -> void:
	var world_env = WorldEnvironment.new()
	var env = Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	var sky_mat = ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.10, 0.19, 0.31)
	sky_mat.sky_horizon_color = Color(0.72, 0.78, 0.83)
	sky_mat.ground_bottom_color = Color(0.10, 0.12, 0.15)
	sky_mat.ground_horizon_color = Color(0.45, 0.48, 0.50)
	env.sky.sky_material = sky_mat
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.48, 0.55, 0.68)
	env.ambient_light_energy = 0.65
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	world_env.environment = env
	add_child(world_env)
	var sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48, -32, 0)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	add_child(sun)

func _mat(color: Color, roughness: float = 0.85) -> StandardMaterial3D:
	var m = StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	return m

func _box(parent: Node3D, size: Vector3, pos: Vector3, material: Material) -> MeshInstance3D:
	var mesh = BoxMesh.new()
	mesh.size = size
	var instance = MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = pos
	instance.material_override = material
	parent.add_child(instance)
	return instance

func _build_city() -> void:
	var asphalt = _mat(Color(0.105, 0.12, 0.14))
	var concrete = _mat(Color(0.38, 0.41, 0.43))
	var white = _mat(Color(0.82, 0.84, 0.82))
	var glass = _mat(Color(0.10, 0.29, 0.40), 0.28)
	var facade_a = _mat(Color(0.38, 0.43, 0.48))
	var facade_b = _mat(Color(0.56, 0.48, 0.39))
	var facade_c = _mat(Color(0.28, 0.36, 0.40))
	_box(self, Vector3(90, 0.5, 90), Vector3(0, -0.35, 0), asphalt)
	_box(self, Vector3(18, 0.12, 70), Vector3(0, -0.04, 0), concrete)
	_box(self, Vector3(70, 0.12, 18), Vector3(0, -0.035, 0), concrete)
	# Crosswalk bars and lane markings.
	for i in range(7):
		_box(self, Vector3(0.55, 0.025, 5.5), Vector3(-5.5 + i * 1.8, 0.04, -9.4), white)
		_box(self, Vector3(5.5, 0.025, 0.42), Vector3(9.2, 0.04, -5.5 + i * 1.8), white)
	for z in [-30.0, 30.0]:
		_box(self, Vector3(90, 0.18, 2.2), Vector3(0, 0.0, z), concrete)
	for x in [-30.0, 30.0]:
		_box(self, Vector3(2.2, 0.18, 90), Vector3(x, 0.0, 0), concrete)
	# Four distinct blocks with varied-height modular buildings.
	var facades = [facade_a, facade_b, facade_c, _mat(Color(0.43, 0.40, 0.49))]
	var rng = RandomNumberGenerator.new()
	rng.seed = 73192
	for bx in range(-2, 3):
		for bz in range(-2, 3):
			if abs(bx) <= 1 and abs(bz) <= 1:
				continue
			var width = rng.randf_range(9.0, 13.0)
			var depth = rng.randf_range(9.0, 13.0)
			var height = rng.randf_range(10.0, 27.0)
			var center = Vector3(bx * 18.0, height * 0.5, bz * 18.0)
			var building = _box(self, Vector3(width, height, depth), center, facades[rng.randi_range(0, facades.size()-1)])
			building.name = "CityBuilding"
			_box(self, Vector3(width + 0.5, 0.45, depth + 0.5), center + Vector3(0, height * 0.5 + 0.2, 0), concrete)
			# Repeated window bands on the street-facing side.
			for floor in range(1, int(height / 2.6)):
				for col in range(3):
					var wx = center.x - width * 0.32 + col * width * 0.32
					_box(self, Vector3(width * 0.22, 1.05, 0.08), Vector3(wx, floor * 2.55, center.z - depth * 0.5 - 0.045), glass)
			# Ground-floor storefront glazing.
			_box(self, Vector3(width * 0.72, 2.1, 0.09), Vector3(center.x, 1.35, center.z - depth * 0.5 - 0.06), glass)
	# Streetlights around the central intersection.
	for p in [Vector3(-10,0,-10), Vector3(10,0,-10), Vector3(-10,0,10), Vector3(10,0,10)]:
		var pole = _box(self, Vector3(0.16, 5.4, 0.16), p + Vector3(0,2.7,0), _mat(Color(0.12,0.14,0.16)))
		_box(self, Vector3(1.5,0.14,0.35), p + Vector3(0,5.35,0), _mat(Color(0.88,0.82,0.59), 0.3))
	# A landmark hero-training plaza.
	_box(self, Vector3(13,0.25,13), Vector3(0,0.08,-15), _mat(Color(0.25,0.30,0.33)))
