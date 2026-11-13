extends CharacterBody3D

@export var walk_speed := 7.0
@export var sprint_speed := 12.0
@export var jump_velocity := 7.2
@export var mouse_sensitivity := 0.0025
@export var quirk_cooldown := 1.0

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var camera_pivot: Node3D
var camera: Camera3D
var cooldown_left := 0.0
var health := 100
var energy := 100

func _ready() -> void:
	_create_body()
	_create_camera()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _create_body() -> void:
	var collision = CollisionShape3D.new()
	var capsule = CapsuleShape3D.new()
	capsule.radius = 0.42
	capsule.height = 1.85
	collision.shape = capsule
	collision.position.y = 0.93
	add_child(collision)
	var suit = _material(Color(0.12, 0.20, 0.29))
	var accent = _material(Color(0.10, 0.72, 0.92), 0.35)
	var skin = _material(Color(0.78, 0.58, 0.43))
	var dark = _material(Color(0.045, 0.06, 0.08))
	_add_capsule(Vector3(0,1.02,0), Vector3(0.62,0.82,0.38), suit)
	_add_sphere(Vector3(0,1.72,0), Vector3(0.48,0.52,0.46), skin)
	_add_box(Vector3(0,1.43,-0.22), Vector3(0.38,0.13,0.06), accent)
	_add_capsule(Vector3(-0.39,1.0,0), Vector3(0.2,0.74,0.22), suit)
	_add_capsule(Vector3(0.39,1.0,0), Vector3(0.2,0.74,0.22), suit)
	_add_capsule(Vector3(-0.17,0.35,0), Vector3(0.25,0.72,0.28), dark)
	_add_capsule(Vector3(0.17,0.35,0), Vector3(0.25,0.72,0.28), dark)
	_add_sphere(Vector3(-0.15,1.75,-0.19), Vector3(0.075,0.055,0.035), accent)
	_add_sphere(Vector3(0.15,1.75,-0.19), Vector3(0.075,0.055,0.035), accent)
	# Shoulder armor and forearm guards give the starter silhouette some definition.
	_add_sphere(Vector3(-0.43,1.38,0), Vector3(0.29,0.25,0.3), accent)
	_add_sphere(Vector3(0.43,1.38,0), Vector3(0.29,0.25,0.3), accent)

func _create_camera() -> void:
	camera_pivot = Node3D.new()
	camera_pivot.position = Vector3(0,1.55,0)
	add_child(camera_pivot)
	var spring = SpringArm3D.new()
	spring.spring_length = 5.4
	spring.margin = 0.2
	camera_pivot.add_child(spring)
	camera = Camera3D.new()
	camera.fov = 76
	camera.current = true
	spring.add_child(camera)

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		camera_pivot.rotate_x(-event.relative.y * mouse_sensitivity)
		camera_pivot.rotation.x = clamp(camera_pivot.rotation.x, deg_to_rad(-55), deg_to_rad(35))
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _physics_process(delta: float) -> void:
	cooldown_left = maxf(0.0, cooldown_left - delta)
	if not is_on_floor():
		velocity.y -= gravity * delta
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity
	var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	var speed = sprint_speed if Input.is_action_pressed("sprint") else walk_speed
	if direction:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0, speed * 7.0 * delta)
		velocity.z = move_toward(velocity.z, 0, speed * 7.0 * delta)
	move_and_slide()
	if Input.is_action_just_pressed("attack"):
		_punch()
	if Input.is_action_just_pressed("quirk"):
		_use_quirk()

func _punch() -> void:
	for node in get_tree().get_nodes_in_group("training_targets"):
		if node is Node3D and global_position.distance_to(node.global_position) < 3.0:
			if node.has_method("take_hit"):
				node.take_hit(20, -global_transform.basis.z)

func _use_quirk() -> void:
	if cooldown_left > 0.0 or energy < 20:
		return
	cooldown_left = quirk_cooldown
	energy -= 20
	var origin = global_position + Vector3.UP * 1.3
	var direction = -global_transform.basis.z
	var query = PhysicsRayQueryParameters3D.create(origin, origin + direction * 18.0)
	query.exclude = [get_rid()]
	var hit = get_world_3d().direct_space_state.intersect_ray(query)
	if not hit.is_empty():
		var target = hit.collider
		if target and target.has_method("take_hit"):
			target.take_hit(35, direction * 1.8)
	var flash = MeshInstance3D.new()
	var sphere = SphereMesh.new()
	sphere.radius = 0.45
	sphere.height = 0.9
	flash.mesh = sphere
	flash.material_override = _material(Color(0.12,0.75,1.0,0.8),0.25)
	get_tree().current_scene.add_child(flash)
	flash.global_position = origin + direction * 2.0
	var tween = create_tween()
	tween.tween_property(flash, "scale", Vector3(3.0,3.0,3.0), 0.22)
	tween.parallel().tween_property(flash, "transparency", 1.0, 0.22)
	tween.tween_callback(flash.queue_free)

func _add_capsule(pos: Vector3, size: Vector3, material: Material) -> void:
	var mesh = CapsuleMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	var instance = MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = pos
	instance.scale = size
	instance.material_override = material
	add_child(instance)

func _add_sphere(pos: Vector3, size: Vector3, material: Material) -> void:
	var mesh = SphereMesh.new()
	var instance = MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = pos
	instance.scale = size
	instance.material_override = material
	add_child(instance)

func _add_box(pos: Vector3, size: Vector3, material: Material) -> void:
	var mesh = BoxMesh.new()
	mesh.size = size
	var instance = MeshInstance3D.new()
	instance.mesh = mesh
	instance.position = pos
	instance.material_override = material
	add_child(instance)

func _material(color: Color, roughness: float = 0.8) -> StandardMaterial3D:
	var material = StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = roughness
	return material
