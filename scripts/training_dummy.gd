extends StaticBody3D

var health := 100
var visual: MeshInstance3D
var label: Label3D

func _ready() -> void:
	add_to_group("training_targets")
	var shape = CollisionShape3D.new()
	var capsule = CapsuleShape3D.new()
	capsule.radius = 0.48
	capsule.height = 2.0
	shape.shape = capsule
	shape.position.y = 1.0
	add_child(shape)
	var mesh = CapsuleMesh.new()
	mesh.radius = 0.48
	mesh.height = 2.0
	visual = MeshInstance3D.new()
	visual.mesh = mesh
	visual.position.y = 1.0
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.78,0.25,0.20)
	mat.roughness = 0.65
	visual.material_override = mat
	add_child(visual)
	label = Label3D.new()
	label.text = "TRAINING BOT  100 HP"
	label.position.y = 2.25
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 32
	label.modulate = Color(1.0,0.9,0.8)
	add_child(label)

func take_hit(amount: int, direction: Vector3) -> void:
	health = maxi(0, health - amount)
	label.text = "TRAINING BOT  %d HP" % health
	visual.scale = Vector3(1.18,0.9,1.18)
	var tween = create_tween()
	tween.tween_property(visual, "scale", Vector3.ONE, 0.16)
	if health <= 0:
		label.text = "DISABLED"
		visual.modulate = Color(0.35,0.35,0.35)
	else:
		global_position += direction * 0.35
